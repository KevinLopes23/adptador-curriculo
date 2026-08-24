import { GoogleGenAI } from '@google/genai';

import type { Resume } from '../types/resume.types.js';
import { ResumeSchema } from '../types/resume.types.js';

export class GeminiService {
  private readonly client: GoogleGenAI;
  private readonly model = 'gemini-3.6-flash';

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async adaptResume(resumeBase: Resume, jobDescription: string): Promise<Resume> {
    const prompt = this.buildPrompt(resumeBase, jobDescription);

    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Falha na chamada a API do Gemini: ${message}`);
    }

    const rawText = response.text;

    if (!rawText) {
      throw new Error('Gemini retornou uma resposta vazia.');
    }

    const parsed = JSON.parse(rawText);
    const validated = ResumeSchema.parse(parsed);

    this.validateIntegrity(resumeBase, validated);

    return validated;
  }

  private buildPrompt(resume: Resume, jobDescription: string): string {
    return `Você é um especialista em recrutamento e otimização de currículos para o mercado de tecnologia.

Sua tarefa é adaptar o currículo abaixo para a vaga descrita, mantendo RIGOROSAMENTE as seguintes regras:

## REGRAS OBRIGATÓRIAS:
1. **NUNCA invente** experiências, empresas, cargos, datas ou certificações que não existam no currículo original.
2. **NUNCA altere** os campos: nome, contato (cidade, telefone, email, linkedin, github), período das experiências, nome das empresas, formação acadêmica.
3. **MANTENHA** exatamente a mesma estrutura JSON de entrada.
4. **MANTENHA** o mesmo número de experiências profissionais (${resume.experienciaProfissional.length} experiências).
5. **MANTENHA** o mesmo número de atividades em cada experiência.

## O QUE VOCÊ PODE ADAPTAR:
- **titulo**: Ajustar o título profissional para alinhar com a vaga (usando apenas termos que condizem com a experiência real).
- **resumoProfissional**: Reformular para destacar as competências mais relevantes para a vaga, usando palavras-chave do job description.
- **principaisCompetencias.hardSkills**: Reordenar e reformular as hard skills existentes para priorizar as mais relevantes à vaga. Pode adicionar skills que o candidato claramente possui baseado nas experiências.
- **principaisCompetencias.sistemasFerramentas**: Reordenar para priorizar tecnologias mencionadas na vaga. Pode adicionar ferramentas diretamente relacionadas que sejam inferíveis das experiências.
- **principaisCompetencias.softSkillsIdiomas**: Reordenar e reformular se necessário.
- **experienciaProfissional[].atividades**: Reformular as atividades usando terminologia e palavras-chave da vaga, mas sem alterar o significado real do que foi feito.

## CURRÍCULO BASE (JSON):
${JSON.stringify(resume, null, 2)}

## JOB DESCRIPTION DA VAGA:
${jobDescription}

## INSTRUÇÕES DE OUTPUT:
Retorne APENAS o JSON adaptado, sem markdown, sem explicações, sem comentários. O JSON deve seguir EXATAMENTE o mesmo schema do currículo base.`;
  }

  /**
   * Valida que a IA não inventou dados críticos.
   * Verifica campos que NUNCA devem mudar.
   */
  private validateIntegrity(original: Resume, adapted: Resume): void {
    const errors: string[] = [];

    if (adapted.nome !== original.nome) {
      errors.push(`Nome alterado: "${original.nome}" -> "${adapted.nome}"`);
    }

    if (adapted.contato.email !== original.contato.email) {
      errors.push('Email foi alterado.');
    }

    if (adapted.contato.telefone !== original.contato.telefone) {
      errors.push('Telefone foi alterado.');
    }

    if (adapted.experienciaProfissional.length !== original.experienciaProfissional.length) {
      errors.push(
        `Numero de experiencias alterado: ${original.experienciaProfissional.length} -> ${adapted.experienciaProfissional.length}`,
      );
    }

    for (let i = 0; i < original.experienciaProfissional.length; i++) {
      const origExp = original.experienciaProfissional[i];
      const adaptExp = adapted.experienciaProfissional[i];

      if (!adaptExp) continue;

      if (adaptExp.empresa !== origExp.empresa) {
        errors.push(`Empresa alterada na experiencia ${i + 1}: "${origExp.empresa}" -> "${adaptExp.empresa}"`);
      }

      if (adaptExp.periodo !== origExp.periodo) {
        errors.push(`Periodo alterado na experiencia ${i + 1}: "${origExp.periodo}" -> "${adaptExp.periodo}"`);
      }
    }

    if (adapted.formacaoAcademica.length !== original.formacaoAcademica.length) {
      errors.push('Formacao academica foi alterada.');
    }

    if (errors.length > 0) {
      throw new Error(
        `Validacao de integridade falhou. A IA alterou dados protegidos:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    }
  }
}
