import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

export const ContactSchema = z.object({
  cidade: z.string(),
  telefone: z.string(),
  email: z.string().email(),
  linkedin: z.string().url(),
  github: z.string(),
});

export const CompetenciesSchema = z.object({
  hardSkills: z.array(z.string()),
  sistemasFerramentas: z.array(z.string()),
  softSkillsIdiomas: z.array(z.string()),
});

export const ExperienceSchema = z.object({
  cargo: z.string(),
  periodo: z.string(),
  empresa: z.string(),
  atividades: z.array(z.string()),
});

export const ResumeSchema = z.object({
  nome: z.string(),
  titulo: z.string(),
  contato: ContactSchema,
  resumoProfissional: z.string(),
  principaisCompetencias: CompetenciesSchema,
  experienciaProfissional: z.array(ExperienceSchema),
  formacaoAcademica: z.array(z.string()),
  certificacoes: z.array(z.string()),
});

// ── TypeScript Types (inferidos do Zod) ──────────────────────────────────────

export type Contact = z.infer<typeof ContactSchema>;
export type Competencies = z.infer<typeof CompetenciesSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
