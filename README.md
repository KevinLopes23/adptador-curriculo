# 🎯 Adaptador de Currículo com IA

CLI em Node.js/TypeScript que adapta automaticamente seu currículo para vagas específicas usando **Google Gemini AI**, mantendo a mesma estrutura visual e garantindo que nenhuma experiência, empresa ou certificação seja inventada.

---

## ✨ Features

- **Adaptação inteligente** — Reformula resumo profissional, competências e descrições de atividades usando palavras-chave da vaga
- **Validação de integridade** — Garante que nome, contato, empresas, datas e formação acadêmica nunca sejam alterados
- **Geração de PDF** — Produz um PDF profissional com layout limpo e estruturado
- **Validação com Zod** — Schema validation no output da IA para garantir estrutura correta
- **Modo arquivo ou interativo** — Passe a job description via arquivo `.txt` ou cole diretamente no terminal

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Python](https://python.org/) 3.10+ (apenas se precisar re-extrair o PDF)
- API Key gratuita do [Google AI Studio](https://aistudio.google.com/apikey)

## 🚀 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/KevinLopes23/adptador-curriculo.git
cd adptador-curriculo

# 2. Instale as dependências
npm install

# 3. Configure a API key
cp .env.example .env
# Edite o .env e adicione sua GEMINI_API_KEY
```

## 🔑 Configuração

Obtenha sua API key gratuita em [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e adicione ao arquivo `.env`:

```env
GEMINI_API_KEY=sua_api_key_aqui
```

## 💻 Como Usar

### Via arquivo (recomendado)

Salve a descrição da vaga em um arquivo `.txt` e execute:

```bash
# Usando o script npm (usa vaga_exemplo.txt por padrão)
npm run adaptar

# Ou especificando o arquivo e saída
npx tsx src/cli.ts adaptar -j minha_vaga.txt -o output/curriculo_empresa_x.pdf
```

### Modo ATS (otimizado para sistemas de recrutamento)

Gera um PDF limpo, sem cores decorativas, com alto contraste — ideal para passar por filtros automáticos de ATS:

```bash
# Via script npm
npm run adaptar:ats

# Ou com flags
npx tsx src/cli.ts adaptar -j minha_vaga.txt --ats
```

> **Visual vs ATS**: O modo padrão gera um PDF bonito com header escuro e cores. O modo `--ats` gera tudo em preto sobre branco, sem backgrounds, sem caracteres unicode — maximizando a leitura por parsers automáticos.

### Modo interativo

Execute sem a flag `-j` e cole a descrição da vaga direto no terminal:

```bash
npx tsx src/cli.ts adaptar
# Cole o texto e pressione Enter 2x para finalizar
```

### Opções

| Flag | Descrição | Default |
|------|-----------|---------|
| `-j, --job <path>` | Caminho para arquivo `.txt` com a job description | Modo interativo |
| `-o, --output <path>` | Caminho do PDF de saída | `./output/curriculo_adaptado.pdf` |
| `--ats` | Gera PDF otimizado para ATS (sem cores, alto contraste) | `false` |

## 📁 Estrutura do Projeto

```
adptador-curriculo/
├── curriculo_modelo.pdf              # PDF original (base)
├── vaga_exemplo.txt                  # Exemplo de job description
├── package.json
├── tsconfig.json
├── .env.example
├── scripts/
│   └── extract-resume.py            # Extrator PDF → JSON (PyMuPDF)
├── src/
│   ├── cli.ts                       # Entry point CLI (Commander.js)
│   ├── data/
│   │   └── resume_base.json         # Dados estruturados do currículo
│   ├── types/
│   │   └── resume.types.ts          # Interfaces + Zod schemas
│   └── services/
│       ├── gemini.service.ts        # Integração Google Gemini AI
│       └── pdf-generator.service.ts # Gerador de PDF (PDFKit)
└── output/                          # PDFs gerados (gitignored)
```

## 🏗️ Arquitetura

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  curriculo_modelo │     │  Job Description │     │                  │
│      .pdf         │     │     .txt         │     │   Google Gemini  │
└────────┬─────────┘     └────────┬─────────┘     │      API         │
         │                        │                └────────┬─────────┘
         ▼                        ▼                         │
┌──────────────────┐     ┌─────────────────┐               │
│  extract-resume  │     │    CLI (cli.ts)  │───────────────┘
│      .py         │     │                  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌─────────────────┐
│ resume_base.json │     │  PDF Generator   │
│  (dados fixos)   │     │    (PDFKit)      │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ curriculo_adap-  │
                         │   tado.pdf       │
                         └─────────────────┘
```

## 🔒 Garantias de Integridade

O sistema valida automaticamente que a IA **não alterou** dados protegidos:

| Campo | Proteção |
|-------|----------|
| Nome | Nunca altera |
| Email, telefone, LinkedIn, GitHub | Nunca altera |
| Nomes das empresas | Nunca altera |
| Períodos de trabalho | Nunca altera |
| Número de experiências | Nunca altera |
| Formação acadêmica | Nunca altera |

Se qualquer violação for detectada, a adaptação é rejeitada com mensagem de erro detalhada.

## 🛠️ Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `adaptar` | `npm run adaptar` | Adapta currículo usando `vaga_exemplo.txt` |
| `adaptar:ats` | `npm run adaptar:ats` | Idem, mas gera PDF otimizado para ATS |
| `start` | `npm start` | Executa a CLI |
| `extract` | `npm run extract` | Re-extrai dados do PDF (requer Python + PyMuPDF) |
| `typecheck` | `npm run typecheck` | Verifica tipagem TypeScript |
| `build` | `npm run build` | Compila para JavaScript |

## 🧰 Stack Tecnológica

- **Runtime**: Node.js + TypeScript
- **IA**: Google Gemini 3.6 Flash (API gratuita)
- **CLI**: Commander.js
- **Validação**: Zod
- **PDF**: PDFKit
- **Extração**: PyMuPDF (Python)

## 📄 Licença

MIT

---

Feito com ❤️ e IA por [Kevin Lopes](https://github.com/KevinLopes23)
