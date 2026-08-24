import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Resume } from '../types/resume.types.js';

// ── Constantes de Layout ─────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ── Tipo de Paleta de Cores ──────────────────────────────────────────────────

interface ColorPalette {
  black: string;
  darkGray: string;
  mediumGray: string;
  lightGray: string;
  lineGray: string;
  headerBg: string;
  headerText: string;
  accent: string;
}

// ── Paleta Visual (modo bonito) ──────────────────────────────────────────────

const VISUAL_COLORS: ColorPalette = {
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#555555',
  lightGray: '#888888',
  lineGray: '#CCCCCC',
  headerBg: '#1a1a2e',
  headerText: '#FFFFFF',
  accent: '#0f3460',
};

// ── Paleta ATS (alto contraste, sem backgrounds) ─────────────────────────────

const ATS_COLORS: ColorPalette = {
  black: '#000000',
  darkGray: '#000000',
  mediumGray: '#222222',
  lightGray: '#333333',
  lineGray: '#666666',
  headerBg: '#FFFFFF',
  headerText: '#000000',
  accent: '#000000',
};

const FONTS = {
  title: 'Helvetica-Bold',
  subtitle: 'Helvetica',
  sectionTitle: 'Helvetica-Bold',
  body: 'Helvetica',
  bodyBold: 'Helvetica-Bold',
} as const;


// ── Service ──────────────────────────────────────────────────────────────────

export class PdfGeneratorService {
  async generate(resume: Resume, outputPath: string, atsMode = false): Promise<void> {
    mkdirSync(dirname(outputPath), { recursive: true });

    const colors: ColorPalette = atsMode ? ATS_COLORS : VISUAL_COLORS;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true,
      });

      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      if (atsMode) {
        this.renderHeaderAts(doc, resume, colors);
      } else {
        this.renderHeaderVisual(doc, resume, colors);
      }

      this.renderResumoProfissional(doc, resume.resumoProfissional, colors);
      this.renderCompetencias(doc, resume.principaisCompetencias, colors, atsMode);
      this.renderExperiencia(doc, resume.experienciaProfissional, colors);
      this.renderFormacao(doc, resume.formacaoAcademica, colors);
      this.renderCertificacoes(doc, resume.certificacoes, colors);

      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  // ── Header Visual (bonito, com fundo escuro) ─────────────────────────────

  private renderHeaderVisual(doc: PDFKit.PDFDocument, resume: Resume, colors: ColorPalette): void {
    doc.rect(0, 0, PAGE_WIDTH, 110).fill(colors.headerBg);

    doc
      .font(FONTS.title)
      .fontSize(22)
      .fillColor(colors.headerText)
      .text(resume.nome, MARGIN, 20, { width: CONTENT_WIDTH, align: 'center' });

    doc
      .font(FONTS.subtitle)
      .fontSize(12)
      .fillColor('#e0e0e0')
      .text(resume.titulo, MARGIN, 48, { width: CONTENT_WIDTH, align: 'center' });

    const { contato } = resume;
    const contactLine = `${contato.cidade} | ${contato.telefone} | ${contato.email}`;
    doc
      .font(FONTS.body)
      .fontSize(9)
      .fillColor('#b0b0b0')
      .text(contactLine, MARGIN, 70, { width: CONTENT_WIDTH, align: 'center' });

    const socialLine = `LinkedIn: ${contato.linkedin} | GitHub: ${contato.github}`;
    doc
      .font(FONTS.body)
      .fontSize(8)
      .fillColor('#9090b0')
      .text(socialLine, MARGIN, 88, { width: CONTENT_WIDTH, align: 'center' });

    doc.y = 125;
  }

  // ── Header ATS (limpo, sem fundo, alto contraste) ────────────────────────

  private renderHeaderAts(doc: PDFKit.PDFDocument, resume: Resume, colors: ColorPalette): void {
    doc.y = MARGIN;

    // Nome grande e preto
    doc
      .font(FONTS.title)
      .fontSize(20)
      .fillColor(colors.black)
      .text(resume.nome, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(0.2);

    // Título profissional
    doc
      .font(FONTS.subtitle)
      .fontSize(11)
      .fillColor(colors.darkGray)
      .text(resume.titulo, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(0.3);

    // Contato em texto puro, tudo preto, separado por pipe
    const { contato } = resume;
    const contactLine = `${contato.cidade} | ${contato.telefone} | ${contato.email}`;
    doc
      .font(FONTS.body)
      .fontSize(9)
      .fillColor(colors.black)
      .text(contactLine, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });

    doc.moveDown(0.15);

    // LinkedIn e GitHub como texto puro (sem hyperlink para ATS)
    const socialLine = `LinkedIn: ${contato.linkedin} | GitHub: ${contato.github}`;
    doc
      .font(FONTS.body)
      .fontSize(8)
      .fillColor(colors.darkGray)
      .text(socialLine, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });

    // Linha separadora fina
    doc.moveDown(0.4);
    const lineY = doc.y;
    doc
      .moveTo(MARGIN, lineY)
      .lineTo(PAGE_WIDTH - MARGIN, lineY)
      .strokeColor(colors.lineGray)
      .lineWidth(0.5)
      .stroke();

    doc.y = lineY + 10;
  }

  // ── Seções Compartilhadas ────────────────────────────────────────────────

  private renderSectionTitle(doc: PDFKit.PDFDocument, title: string, colors: ColorPalette): void {
    this.ensureSpace(doc, 40);

    doc.moveDown(0.6);

    doc
      .font(FONTS.sectionTitle)
      .fontSize(11)
      .fillColor(colors.accent)
      .text(title.toUpperCase(), MARGIN, doc.y);

    const lineY = doc.y + 3;
    doc
      .moveTo(MARGIN, lineY)
      .lineTo(PAGE_WIDTH - MARGIN, lineY)
      .strokeColor(colors.lineGray)
      .lineWidth(0.8)
      .stroke();

    doc.y = lineY + 8;
  }

  private renderResumoProfissional(doc: PDFKit.PDFDocument, resumo: string, colors: ColorPalette): void {
    this.renderSectionTitle(doc, 'Resumo Profissional', colors);

    doc
      .font(FONTS.body)
      .fontSize(9.5)
      .fillColor(colors.darkGray)
      .text(resumo, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: 'justify',
        lineGap: 2,
      });
  }

  private renderCompetencias(
    doc: PDFKit.PDFDocument,
    competencias: Resume['principaisCompetencias'],
    colors: ColorPalette,
    atsMode: boolean,
  ): void {
    this.renderSectionTitle(doc, 'Principais Competencias', colors);

    if (atsMode) {
      // ATS: lista tudo em texto corrido separado por vírgula, sem labels sofisticados
      this.renderCompetenciaCategoryAts(doc, 'Hard Skills', competencias.hardSkills, colors);
      this.renderCompetenciaCategoryAts(doc, 'Sistemas e Ferramentas', competencias.sistemasFerramentas, colors);
      this.renderCompetenciaCategoryAts(doc, 'Soft Skills e Idiomas', competencias.softSkillsIdiomas, colors);
    } else {
      this.renderCompetenciaCategory(doc, 'Hard Skills', competencias.hardSkills, colors);
      this.renderCompetenciaCategory(doc, 'Sistemas e Ferramentas', competencias.sistemasFerramentas, colors);
      this.renderCompetenciaCategory(doc, 'Soft Skills & Idiomas', competencias.softSkillsIdiomas, colors);
    }
  }

  private renderCompetenciaCategory(
    doc: PDFKit.PDFDocument,
    label: string,
    items: string[],
    colors: ColorPalette,
  ): void {
    this.ensureSpace(doc, 20);

    const startY = doc.y;
    const labelWidth = 140;

    doc
      .font(FONTS.bodyBold)
      .fontSize(9)
      .fillColor(colors.darkGray)
      .text(`${label}:`, MARGIN, startY, { width: labelWidth, continued: false });

    const valueX = MARGIN + labelWidth;
    const valueWidth = CONTENT_WIDTH - labelWidth;

    doc
      .font(FONTS.body)
      .fontSize(9)
      .fillColor(colors.mediumGray)
      .text(items.join(', '), valueX, startY, {
        width: valueWidth,
        lineGap: 2,
      });

    doc.moveDown(0.3);
  }

  private renderCompetenciaCategoryAts(
    doc: PDFKit.PDFDocument,
    label: string,
    items: string[],
    colors: ColorPalette,
  ): void {
    this.ensureSpace(doc, 20);

    // ATS-friendly: label em bold seguido do conteúdo na mesma linha
    doc
      .font(FONTS.bodyBold)
      .fontSize(9)
      .fillColor(colors.black)
      .text(`${label}: `, MARGIN, doc.y, { continued: true });

    doc
      .font(FONTS.body)
      .fontSize(9)
      .fillColor(colors.darkGray)
      .text(items.join(', '), { width: CONTENT_WIDTH - 10, lineGap: 2 });

    doc.moveDown(0.3);
  }

  private renderExperiencia(doc: PDFKit.PDFDocument, experiencias: Resume['experienciaProfissional'], colors: ColorPalette): void {
    this.renderSectionTitle(doc, 'Experiencia Profissional', colors);

    for (const exp of experiencias) {
      this.ensureSpace(doc, 60);

      const cargoY = doc.y;

      doc
        .font(FONTS.bodyBold)
        .fontSize(10)
        .fillColor(colors.darkGray)
        .text(exp.cargo, MARGIN, cargoY, { width: CONTENT_WIDTH * 0.6 });

      doc
        .font(FONTS.body)
        .fontSize(9)
        .fillColor(colors.lightGray)
        .text(exp.periodo, MARGIN, cargoY, { width: CONTENT_WIDTH, align: 'right' });

      doc
        .font(FONTS.subtitle)
        .fontSize(9.5)
        .fillColor(colors.accent)
        .text(exp.empresa, MARGIN, doc.y + 2);

      doc.moveDown(0.3);

      for (const atividade of exp.atividades) {
        this.ensureSpace(doc, 15);

        const bulletX = MARGIN + 8;
        const textX = MARGIN + 18;
        const textWidth = CONTENT_WIDTH - 18;

        // Usar hífen simples em vez de unicode bullet (mais seguro para ATS)
        doc
          .font(FONTS.body)
          .fontSize(9)
          .fillColor(colors.darkGray)
          .text('-', bulletX, doc.y, { continued: false });

        doc.y -= doc.currentLineHeight();

        doc
          .font(FONTS.body)
          .fontSize(9)
          .fillColor(colors.mediumGray)
          .text(atividade, textX, doc.y, {
            width: textWidth,
            lineGap: 1.5,
          });

        doc.moveDown(0.1);
      }

      doc.moveDown(0.5);
    }
  }

  private renderFormacao(doc: PDFKit.PDFDocument, formacao: string[], colors: ColorPalette): void {
    this.renderSectionTitle(doc, 'Formacao Academica', colors);

    for (const item of formacao) {
      this.ensureSpace(doc, 15);

      doc
        .font(FONTS.body)
        .fontSize(9.5)
        .fillColor(colors.darkGray)
        .text(item, MARGIN, doc.y, { width: CONTENT_WIDTH });

      doc.moveDown(0.2);
    }
  }

  private renderCertificacoes(doc: PDFKit.PDFDocument, certificacoes: string[], colors: ColorPalette): void {
    this.renderSectionTitle(doc, 'Certificacoes e Cursos Complementares', colors);

    for (const cert of certificacoes) {
      this.ensureSpace(doc, 15);

      const textX = MARGIN + 18;

      doc
        .font(FONTS.body)
        .fontSize(9)
        .fillColor(colors.darkGray)
        .text('-', MARGIN + 8, doc.y, { continued: false });

      doc.y -= doc.currentLineHeight();

      doc
        .font(FONTS.body)
        .fontSize(9.5)
        .fillColor(colors.darkGray)
        .text(cert, textX, doc.y, { width: CONTENT_WIDTH - 18 });

      doc.moveDown(0.2);
    }
  }

  private ensureSpace(doc: PDFKit.PDFDocument, requiredSpace: number): void {
    const pageHeight = 841.89; // A4
    const bottomMargin = MARGIN + 20;

    if (doc.y + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage();
      doc.y = MARGIN;
    }
  }
}
