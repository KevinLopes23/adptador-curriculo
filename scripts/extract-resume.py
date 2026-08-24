"""
Extrai o conteúdo do currículo PDF e gera um JSON estruturado.
Uso: python scripts/extract-resume.py
"""

import json
import os
import re
import pymupdf


def extract_resume(pdf_path: str) -> dict:
    """Extrai e estrutura os dados do currículo PDF."""
    doc = pymupdf.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    lines = [line.strip() for line in full_text.split("\n") if line.strip()]

    resume: dict = {
        "nome": "",
        "titulo": "",
        "contato": {
            "cidade": "",
            "telefone": "",
            "email": "",
            "linkedin": "",
            "github": "",
        },
        "resumoProfissional": "",
        "principaisCompetencias": {
            "hardSkills": [],
            "sistemasFerramentas": [],
            "softSkillsIdiomas": [],
        },
        "experienciaProfissional": [],
        "formacaoAcademica": [],
        "certificacoes": [],
    }

    # Linha 1: Nome
    resume["nome"] = lines[0] if lines else ""

    # Linha 2: Título
    resume["titulo"] = lines[1] if len(lines) > 1 else ""

    # Linha 3: Contato (cidade, telefone, email)
    if len(lines) > 2:
        contato_line = lines[2]
        parts = [p.strip() for p in contato_line.split("|")]
        if len(parts) >= 1:
            resume["contato"]["cidade"] = parts[0]
        if len(parts) >= 2:
            resume["contato"]["telefone"] = parts[1]
        if len(parts) >= 3:
            resume["contato"]["email"] = parts[2]

    # Linha 4: LinkedIn e GitHub
    if len(lines) > 3:
        social_line = lines[3]
        linkedin_match = re.search(r"https?://[^\s|]+linkedin[^\s|]+", social_line)
        github_match = re.search(r"https?://[^\s|]+github[^\s|]+", social_line)
        if linkedin_match:
            resume["contato"]["linkedin"] = linkedin_match.group(0)
        if github_match:
            resume["contato"]["github"] = github_match.group(0)

    # Encontrar seções por títulos conhecidos
    section_headers = {
        "RESUMO PROFISSIONAL": "resumo",
        "PRINCIPAIS COMPETÊNCIAS": "competencias",
        "PRINCIPAIS COMPETENCIAS": "competencias",
        "EXPERIÊNCIA PROFISSIONAL": "experiencia",
        "EXPERIENCIA PROFISSIONAL": "experiencia",
        "FORMAÇÃO ACADÊMICA": "formacao",
        "FORMACAO ACADEMICA": "formacao",
        "CERTIFICAÇÕES E CURSOS COMPLEMENTARES": "certificacoes",
        "CERTIFICACOES E CURSOS COMPLEMENTARES": "certificacoes",
    }

    sections: dict[str, list[str]] = {}
    current_section = None

    for line in lines[4:]:
        normalized = (
            line.upper()
            .replace("Ê", "E")
            .replace("Ã", "A")
            .replace("Ç", "C")
            .replace("Õ", "O")
            .replace("É", "E")
        )

        matched = False
        for header, key in section_headers.items():
            if normalized == header or header in normalized:
                current_section = key
                sections[current_section] = []
                matched = True
                break

        if not matched and current_section:
            sections[current_section].append(line)

    # Resumo Profissional
    if "resumo" in sections:
        resume["resumoProfissional"] = " ".join(sections["resumo"])

    # Competências
    if "competencias" in sections:
        comp_text = " ".join(sections["competencias"])

        hard_match = re.search(
            r"Hard Skills?:\s*(.*?)(?=Sistemas e Ferramentas|Soft Skills|$)",
            comp_text,
            re.IGNORECASE,
        )
        tools_match = re.search(
            r"Sistemas e Ferramentas:\s*(.*?)(?=Soft Skills|$)",
            comp_text,
            re.IGNORECASE,
        )
        soft_match = re.search(
            r"Soft Skills?\s*&?\s*Idiomas:\s*(.*?)$", comp_text, re.IGNORECASE
        )

        if hard_match:
            resume["principaisCompetencias"]["hardSkills"] = [
                s.strip() for s in hard_match.group(1).split(",") if s.strip()
            ]
        if tools_match:
            resume["principaisCompetencias"]["sistemasFerramentas"] = [
                s.strip() for s in tools_match.group(1).split(",") if s.strip()
            ]
        if soft_match:
            resume["principaisCompetencias"]["softSkillsIdiomas"] = [
                s.strip() for s in soft_match.group(1).split(",") if s.strip()
            ]

    # Experiência Profissional
    if "experiencia" in sections:
        exp_lines = sections["experiencia"]
        current_exp = None

        i = 0
        while i < len(exp_lines):
            line = exp_lines[i]

            # Detectar cargo (contém "Desenvolvedor", "Estagiário", etc.)
            if re.search(
                r"(Desenvolvedor|Estagiário|Estagi|Engineer|Developer|Analista|Pleno|Junior|Sênior|Senior)",
                line,
                re.IGNORECASE,
            ):
                if current_exp:
                    resume["experienciaProfissional"].append(current_exp)

                current_exp = {
                    "cargo": line,
                    "periodo": "",
                    "empresa": "",
                    "atividades": [],
                }

                # Próxima linha geralmente é o período
                if i + 1 < len(exp_lines) and re.search(
                    r"\d{4}", exp_lines[i + 1]
                ):
                    current_exp["periodo"] = exp_lines[i + 1]
                    i += 1

                # Próxima linha é a empresa
                if i + 1 < len(exp_lines) and not exp_lines[i + 1].startswith(
                    ("•", "-", "●")
                ):
                    possible_empresa = exp_lines[i + 1]
                    if not re.search(
                        r"(Desenvolvedor|Estagiário|Engineer|Developer)",
                        possible_empresa,
                        re.IGNORECASE,
                    ):
                        current_exp["empresa"] = possible_empresa
                        i += 1

            elif current_exp and line not in ("•", "●", "-"):
                # Limpar marcadores de bullet point
                cleaned = re.sub(r"^[•●\-]\s*", "", line)
                if cleaned:
                    current_exp["atividades"].append(cleaned)

            i += 1

        if current_exp:
            resume["experienciaProfissional"].append(current_exp)

    # Formação Acadêmica
    if "formacao" in sections:
        resume["formacaoAcademica"] = [
            line for line in sections["formacao"] if line not in ("•", "●", "-")
        ]

    # Certificações
    if "certificacoes" in sections:
        resume["certificacoes"] = [
            re.sub(r"^[•●\-]\s*", "", line)
            for line in sections["certificacoes"]
            if line not in ("•", "●", "-")
        ]

    return resume


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    pdf_path = os.path.join(project_root, "curriculo_modelo.pdf")
    output_path = os.path.join(project_root, "src", "data", "resume_base.json")

    if not os.path.exists(pdf_path):
        print(f"Erro: PDF nao encontrado em {pdf_path}")
        return

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    resume = extract_resume(pdf_path)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(resume, f, ensure_ascii=False, indent=2)

    print("[OK] Curriculo extraido com sucesso!")
    print(f"   Saida: {output_path}")
    print(f"   Nome: {resume['nome']}")
    print(f"   Experiencias: {len(resume['experienciaProfissional'])}")
    print(f"   Certificacoes: {len(resume['certificacoes'])}")


if __name__ == "__main__":
    main()
