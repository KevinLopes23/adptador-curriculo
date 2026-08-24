#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Command } from 'commander';
import dotenv from 'dotenv';

import type { Resume } from './types/resume.types.js';
import { ResumeSchema } from './types/resume.types.js';
import { GeminiService } from './services/gemini.service.js';
import { PdfGeneratorService } from './services/pdf-generator.service.js';

dotenv.config();

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadResumeBase(): Resume {
  const resumePath = resolve(import.meta.dirname, 'data', 'resume_base.json');

  if (!existsSync(resumePath)) {
    console.error(`[ERRO] Arquivo resume_base.json nao encontrado em: ${resumePath}`);
    console.error('       Execute "npm run extract" para gerar o JSON do curriculo.');
    process.exit(1);
  }

  const raw = readFileSync(resumePath, 'utf-8');
  const data = JSON.parse(raw);

  return ResumeSchema.parse(data);
}

function readJobDescriptionFromFile(filePath: string): string {
  const fullPath = resolve(filePath);

  if (!existsSync(fullPath)) {
    console.error(`[ERRO] Arquivo de job description nao encontrado: ${fullPath}`);
    process.exit(1);
  }

  const content = readFileSync(fullPath, 'utf-8').trim();

  if (!content) {
    console.error('[ERRO] O arquivo de job description esta vazio.');
    process.exit(1);
  }

  return content;
}

async function readJobDescriptionInteractive(): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolvePromise) => {
    console.log('\n--- Cole a Job Description abaixo (pressione Enter 2x para finalizar) ---\n');

    const lines: string[] = [];
    let emptyLineCount = 0;

    rl.on('line', (line: string) => {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          rl.close();
          return;
        }
      } else {
        emptyLineCount = 0;
      }
      lines.push(line);
    });

    rl.on('close', () => {
      resolvePromise(lines.join('\n').trim());
    });
  });
}

function getApiKey(): string {
  const apiKey = process.env['GEMINI_API_KEY'];

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[ERRO] GEMINI_API_KEY nao configurada.');
    console.error('       1. Copie .env.example para .env');
    console.error('       2. Adicione sua API key do Google AI Studio');
    console.error('       3. Obtenha em: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  return apiKey;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('adaptador-curriculo')
  .description('Adapta seu curriculo para vagas usando Google Gemini AI')
  .version('1.0.0');

program
  .command('adaptar')
  .description('Adapta o curriculo base para uma vaga especifica')
  .option('-j, --job <path>', 'Caminho para arquivo .txt com a job description')
  .option('-o, --output <path>', 'Caminho do PDF de saida', './output/curriculo_adaptado.pdf')
  .option('--ats', 'Gerar PDF otimizado para sistemas ATS (sem cores, alto contraste)', false)
  .action(async (options: { job?: string; output: string; ats: boolean }) => {
    try {
      console.log('\n=== Adaptador de Curriculo com IA ===\n');

      // 1. Carregar currículo base
      console.log('[1/4] Carregando curriculo base...');
      const resumeBase = loadResumeBase();
      console.log(`      Nome: ${resumeBase.nome}`);
      console.log(`      Experiencias: ${resumeBase.experienciaProfissional.length}`);

      // 2. Ler job description
      console.log('\n[2/4] Lendo job description...');
      let jobDescription: string;

      if (options.job) {
        jobDescription = readJobDescriptionFromFile(options.job);
        console.log(`      Arquivo: ${options.job}`);
      } else {
        jobDescription = await readJobDescriptionInteractive();
      }

      console.log(`      Tamanho: ${jobDescription.length} caracteres`);

      if (jobDescription.length < 50) {
        console.error('[ERRO] Job description muito curta. Forneça uma descricao mais detalhada.');
        process.exit(1);
      }

      // 3. Adaptar com Gemini
      console.log('\n[3/4] Adaptando curriculo com Gemini AI...');
      const apiKey = getApiKey();
      const geminiService = new GeminiService(apiKey);

      const adaptedResume = await geminiService.adaptResume(resumeBase, jobDescription);
      console.log('      Curriculo adaptado com sucesso!');
      console.log(`      Titulo adaptado: ${adaptedResume.titulo}`);

      // 4. Gerar PDF
      console.log(`\n[4/4] Gerando PDF${options.ats ? ' (modo ATS)' : ''}...`);
      const pdfGenerator = new PdfGeneratorService();
      const outputPath = resolve(options.output);

      await pdfGenerator.generate(adaptedResume, outputPath, options.ats);
      console.log(`      PDF salvo em: ${outputPath}`);

      console.log('\n=== Concluido com sucesso! ===\n');
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n[ERRO] ${error.message}`);

        if (error.message.includes('API key')) {
          console.error('       Verifique sua GEMINI_API_KEY no arquivo .env');
        }
      } else {
        console.error('\n[ERRO] Erro desconhecido:', error);
      }

      process.exit(1);
    }
  });

program.parse();
