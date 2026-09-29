"""Páginas do catálogo (T014–T018; contracts/artefatos-gerados.md).

Cada função recebe o Contexto do gerador e devolve o texto Markdown de uma página. Saída
determinística: toda lista é ordenada e nada depende de data de execução.
"""

import re
from collections import defaultdict

from ferramentas.anotacoes import buckets_na_condicao

PAPEIS_API = ("anon", "authenticated", "service_role", "PUBLIC")


# --- utilitários de formatação -------------------------------------------------------------

def celula(texto) -> str:
    """Texto seguro para célula de tabela Markdown."""
    if texto is None or texto == "":
        return ""
    t = str(texto).replace("\\", "\\\\").replace("|", "\\|").replace("\r", "")
    return re.sub(r"\s*\n\s*", "<br>", t.strip())


def codigo(texto) -> str:
    return f"`{texto}`" if texto not in (None, "") else ""


def detalhes(titulo: str, conteudo: str, linguagem: str = "sql") -> str:
    return f"<details><summary>{titulo}</summary>\n\n```{linguagem}\n{(conteudo or '').strip()}\n```\n\n</details>\n"


def nome_de(chave: str) -> str:
    return chave.split(":", 1)[1]


def link(chave: str, base: str = "") -> str:
    """Link para a página do objeto, a partir de uma página em `base` ('' = catalogo/)."""
    tipo, nome = chave.split(":", 1)
    if tipo == "tabela":
        return f"[{nome}]({base}tabelas/{nome}.md)"
    if tipo == "funcao":
        return f"[{nome}]({base}funcoes/{nome.split('(')[0]}.md)"
    if tipo == "bucket":
        return f"[{nome}]({base}arquivos.md#{nome})"
    return codigo(chave)


def texto_anotado(anot: dict, campo: str) -> str:
    """Texto da anotação com a fonte (ou marca de hipótese); vazio se não houver."""
    texto = (anot.get(campo) or "").strip()
    if not texto:
        return ""
    fontes = [str(f) for f in (anot.get("fonte") or []) if str(f).strip()]
    if anot.get("hipotese") is True or not fontes:
        return f"{texto} ⚠️ *hipótese*"
    return f"{texto} *(fonte: {', '.join(fontes)})*"


def descrever_dono(ctx, chave: str) -> str:
    modulo, fora = ctx.anot.dono(chave, ctx.inv)
    if modulo:
        return f"módulo **{modulo}**"
    if fora:
        extra = f", achado {fora['achado']}" if fora.get("achado") else ""
        return f"fora do escopo: **{fora['classificacao']}** — {fora.get('motivo', '')}{extra}"
    return "**sem dono** (lacuna)"


def secao_divergencias_e_achados(ctx, chaves: list[str], base: str) -> list[str]:
    linhas = ["## Divergências e achados", ""]
    divs = [d for d in ctx.divergencias if d.chave in chaves]
    achados = [a for a in ctx.anot.achados if set(a.get("objetos", [])) & set(chaves)]
    if not divs and not achados:
        return linhas + ["_Nenhuma divergência entre produção e migrations, nenhum achado._", ""]
    for d in sorted(divs, key=lambda d: d.chave):
        classificacao = ctx.classificacao(d.chave)
        linhas.append(f"- Divergência `{d.chave}`: **{d.tipo}**, classificação **{classificacao}** "
                      f"([detalhes]({base}../divergencias.md)).")
    for a in sorted(achados, key=lambda a: a["id"]):
        linhas.append(f"- Achado **{a['id']}** — {a.get('titulo', '')} (situação: {a.get('situacao')}; "
                      f"[detalhes]({base}../achados.md#{a['id'].lower()})).")
    return linhas + [""]


# --- página de tabela ----------------------------------------------------------------------

def _valores_em_uso(ctx, tabela: str, coluna: str) -> str:
    partes = []
    dom = ctx.dominio.get((tabela, coluna))
    if dom and "valores" in dom:
        valores = sorted(dom["valores"].items(), key=lambda kv: (-kv[1], kv[0]))
        partes.append(", ".join(f"{codigo(v)} ({n})" for v, n in valores))
    js = ctx.json.get((tabela, coluna))
    if js:
        formas = ", ".join(f"{k} ({v})" for k, v in sorted((js.get("formas") or {}).items()))
        elementos = ", ".join(f"{k} ({v})" for k, v in sorted((js.get("tipos_dos_elementos_das_listas") or {}).items()))
        chaves = ", ".join(f"{codigo(c['chave'])}:{c['tipo']} ({c['ocorrencias']})" for c in js.get("chaves", []))
        partes.append("JSON — formas: " + (formas or "nenhuma linha")
                      + (f"; elementos: {elementos}" if elementos else "")
                      + (f"; chaves: {chaves}" if chaves else ""))
    return "<br>".join(partes)


def pagina_tabela(ctx, chave: str) -> str:
    obj = ctx.inv.objetos[chave]
    a = obj.atributos
    nome = a["nome"]
    anot = ctx.anot.objetos.get(chave, {})
    linhas = [ctx.aviso(), f"# {nome}", ""]
    linhas.append(f"- **Tipo**: {obj.tipo}")
    linhas.append(f"- **Dono**: {descrever_dono(ctx, chave)}")
    if obj.tipo == "tabela":
        linhas.append(f"- **Linhas em produção**: {a.get('linhas_exatas')}")
        linhas.append(f"- **RLS ativo**: {'sim' if a.get('rls_ativo') else 'não'}"
                      f"{' (forçado)' if a.get('rls_forcado') else ''}")
    opcoes = ctx.opcoes.get(nome)
    if opcoes and opcoes.get("opcoes"):
        linhas.append(f"- **Opções**: {codigo(', '.join(opcoes['opcoes']))}")
    elif obj.tipo == "view":
        linhas.append("- **Opções**: nenhuma — a view **não** declara `security_invoker`, então roda com as permissões do dono")
    linhas += ["", "## Finalidade", ""]
    linhas.append(texto_anotado(anot, "finalidade") or "_Sem anotação._")
    if a.get("comentario"):
        linhas += ["", f"Comentário no banco: {a['comentario']}"]
    linhas.append("")

    # Colunas
    linhas += ["## Colunas", "", "| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |",
               "|---:|---|---|:---:|---|---|---|"]
    for col in ctx.colunas.get(nome, []):
        c_chave = f"coluna:{nome}.{col['coluna']}"
        significado = texto_anotado(ctx.anot.objetos.get(c_chave, {}), "significado") or (
            f"Comentário no banco: {col['comentario']}" if col.get("comentario") else "")
        linhas.append("| " + " | ".join([
            str(col["posicao"]), codigo(col["coluna"]), celula(col["tipo"]), "sim" if col["obrigatoria"] else "",
            codigo(celula(col.get("padrao"))) if col.get("padrao") else "", celula(significado),
            celula(_valores_em_uso(ctx, nome, col["coluna"])),
        ]) + " |")
    linhas.append("")

    # Restrições e índices
    linhas += ["## Restrições e índices", ""]
    restricoes = sorted((o for o in ctx.filhos[chave] if o.tipo == "restricao"), key=lambda o: o.chave)
    indices = sorted((o for o in ctx.filhos[chave] if o.tipo == "indice"), key=lambda o: o.chave)
    if restricoes:
        linhas += ["| Restrição | Tipo | Definição |", "|---|---|---|"]
        linhas += [f"| {codigo(o.atributos['nome'])} | {o.atributos['tipo']} | {codigo(celula(o.atributos['definicao']))} |"
                   for o in restricoes]
        linhas.append("")
    if indices:
        linhas += ["| Índice | Definição |", "|---|---|"]
        linhas += [f"| {codigo(o.atributos['nome'])} | {codigo(celula(o.atributos['definicao']))} |" for o in indices]
        linhas.append("")
    if not restricoes and not indices:
        linhas += ["_Nenhuma._", ""]

    # Dependências
    linhas += ["## Dependências", "", "**Depende de:**", ""]
    saida = ctx.grafo.dependencias_de(chave)
    linhas += [f"- {link(x.para, '../')} — {x.natureza} ({x.origem})" for x in saida] or ["- _nada_"]
    linhas += ["", "**É usada por:**", ""]
    entrada = ctx.grafo.dependentes_de(chave)
    linhas += [f"- {link(x.de, '../')} — {x.natureza} ({x.origem})" for x in entrada] or ["- _nada_"]
    linhas.append("")

    # Gatilhos
    linhas += ["## Gatilhos", ""]
    gatilhos = sorted((o for o in ctx.filhos[chave] if o.tipo == "gatilho"), key=lambda o: o.chave)
    if gatilhos:
        linhas += ["| Gatilho | Situação | Função | Efeito |", "|---|---|---|---|"]
        for g in gatilhos:
            funcoes = [link(x.para, "../") for x in ctx.grafo.dependencias_de(g.chave)]
            efeito = texto_anotado(ctx.anot.objetos.get(g.chave, {}), "efeito") or "_Sem anotação._"
            linhas.append(f"| {codigo(g.atributos['nome'])} | {g.atributos['situacao']} | {', '.join(funcoes)} | {celula(efeito)} |")
        linhas.append("")
        for g in gatilhos:
            linhas.append(detalhes(f"Definição de {g.atributos['nome']}", g.atributos["definicao"]))
    else:
        linhas += ["_Nenhum._", ""]

    # Políticas
    linhas += ["## Políticas de acesso", ""]
    politicas = sorted((o for o in ctx.filhos[chave] if o.tipo == "politica"), key=lambda o: o.chave)
    if politicas:
        for p in politicas:
            pa = p.atributos
            auxiliares = sorted({link(x.para, "../") for x in ctx.grafo.dependencias_de(p.chave)})
            descricao = texto_anotado(ctx.anot.objetos.get(p.chave, {}), "descricao") or "_Sem anotação._"
            linhas += [f"### {pa['nome']}", "",
                       f"- **Papéis**: {', '.join(pa.get('papeis') or [])} · **Operação**: {pa.get('comando')} · "
                       f"**{pa.get('permissiva')}**",
                       f"- **Em linguagem simples**: {descricao}"]
            if auxiliares:
                linhas.append(f"- **Funções auxiliares**: {', '.join(auxiliares)}")
            linhas.append("")
            condicao = f"USING:\n{pa.get('condicao_using') or '(nenhuma)'}\n\nWITH CHECK:\n{pa.get('condicao_with_check') or '(nenhuma)'}"
            linhas.append(detalhes("Condição original", condicao))
    else:
        linhas += ["_Nenhuma._", ""]

    chaves_da_pagina = [chave] + [o.chave for o in ctx.filhos[chave]]
    linhas += secao_divergencias_e_achados(ctx, chaves_da_pagina, "../")
    return "\n".join(linhas)


# --- página de função ----------------------------------------------------------------------

def pagina_funcao(ctx, nome: str) -> str:
    chaves = sorted(c for c, o in ctx.inv.objetos.items() if o.tipo == "funcao" and o.atributos["nome"] == nome)
    linhas = [ctx.aviso(), f"# {nome}", ""]
    if len(chaves) > 1:
        linhas += [f"{len(chaves)} versões com o mesmo nome (sobrecarga). Cada uma é um objeto do catálogo.", ""]
    for chave in chaves:
        a = ctx.inv.objetos[chave].atributos
        anot = ctx.anot.objetos.get(chave, {})
        saida = ctx.grafo.dependencias_de(chave)
        entrada = ctx.grafo.dependentes_de(chave)
        linhas += [f"## `{nome}({a['argumentos']})`", ""]
        linhas += [
            f"- **Retorno**: {codigo(a['retorno'])} · **Linguagem**: {a['linguagem']} · **Volatilidade**: {a['volatilidade']}",
            f"- **Permissão elevada** (`SECURITY DEFINER`): {'**sim**' if a['security_definer'] else 'não'}",
            f"- **Dono**: {descrever_dono(ctx, chave)}",
            "",
            f"**Finalidade**: {texto_anotado(anot, 'finalidade') or '_Sem anotação._'}",
            "",
        ]
        if anot.get("regra_de_negocio"):
            linhas += [f"**Regra de negócio**: {anot['regra_de_negocio'].strip()}", ""]
        le = sorted({link(x.para, '../') for x in saida if x.natureza == "le"})
        escreve = sorted({link(x.para, '../') for x in saida if x.natureza == "escreve"})
        chama = sorted({link(x.para, '../') for x in saida if x.natureza == "chama"})
        linhas += [f"- **Lê**: {', '.join(le) or '—'}", f"- **Escreve**: {', '.join(escreve) or '—'}",
                   f"- **Chama**: {', '.join(chama) or '—'}"]
        chamadores = sorted({f"{link(x.de, '../')} ({x.natureza})" for x in entrada})
        anotados = [str(c) for c in (anot.get("chamada_por") or [])]
        linhas.append(f"- **Chamada por (banco)**: {', '.join(chamadores) or '—'}")
        linhas.append(f"- **Chamada por (telas e edge functions, anotado)**: {', '.join(anotados) or '_Sem anotação._'}")
        linhas.append("")
        linhas.append(detalhes("Código completo (produção)", a["definicao"]))
    linhas += secao_divergencias_e_achados(ctx, chaves, "../")
    return "\n".join(linhas)


# --- arquivos, acesso, tipos, externos -----------------------------------------------------

def pagina_arquivos(ctx) -> str:
    buckets = sorted((o for o in ctx.inv.objetos.values() if o.tipo == "bucket"), key=lambda o: o.chave)
    volume = {v["bucket"]: v for v in ctx.inv.secoes.get("arquivos_por_bucket", [])}
    padroes = defaultdict(list)
    for p in ctx.inv.secoes.get("padroes_caminho_arquivos", []):
        padroes[p["bucket"]].append(p)
    politicas = defaultdict(list)
    for o in ctx.inv.objetos.values():
        if o.tipo == "politica" and o.atributos.get("esquema") == "storage":
            texto = f"{o.atributos.get('condicao_using') or ''} {o.atributos.get('condicao_with_check') or ''}"
            achados = buckets_na_condicao(texto)
            for b in achados or ["(sem bucket identificado na condição)"]:
                politicas[b].append(o)
    funcoes = [o for o in ctx.inv.objetos.values() if o.tipo == "funcao"]
    linhas = [ctx.aviso(), "# Repositórios de arquivos", "",
              f"{len(buckets)} buckets · {sum(v.get('arquivos', 0) for v in volume.values())} arquivos · "
              f"{sum(v.get('bytes', 0) for v in volume.values())} bytes.", ""]
    for o in buckets:
        b = o.atributos
        anot = ctx.anot.objetos.get(o.chave, {})
        v = volume.get(b["id"], {})
        linhas += [f"## {b['id']}", "",
                   f"- **Dono**: {descrever_dono(ctx, o.chave)}",
                   f"- **Público**: {'**sim**' if b.get('public') else 'não'} · **Limite de tamanho**: "
                   f"{b.get('file_size_limit') or 'sem limite'} · **Tipos aceitos**: "
                   f"{', '.join(b.get('allowed_mime_types') or []) or 'qualquer'}",
                   f"- **Volume**: {v.get('arquivos', 0)} arquivos, {v.get('bytes', 0)} bytes "
                   f"({v.get('primeiro', '—')} a {v.get('ultimo', '—')})",
                   "", f"**Finalidade**: {texto_anotado(anot, 'finalidade') or '_Sem anotação._'}", ""]
        if padroes.get(b["id"]):
            linhas += ["| Padrão de caminho | Arquivos |", "|---|---:|"]
            linhas += [f"| {codigo(p['padrao'])} | {p['arquivos']} |"
                       for p in sorted(padroes[b["id"]], key=lambda p: (-p["arquivos"], p["padrao"]))]
            linhas.append("")
        refs = sorted(f"[{f.atributos['nome']}](funcoes/{f.atributos['nome']}.md)" for f in funcoes
                      if f"'{b['id']}'" in (f.atributos.get("definicao") or ""))
        anotadas = [str(r) for r in (anot.get("referenciado_por") or [])]
        linhas.append(f"- **Funções que citam o bucket**: {', '.join(sorted(set(refs))) or '—'}")
        linhas.append(f"- **Referenciado por (anotado)**: {', '.join(anotadas) or '_Sem anotação._'}")
        linhas += ["", "**Políticas de acesso:**", ""]
        for p in sorted(politicas.get(b["id"], []), key=lambda o: o.chave):
            pa = p.atributos
            descricao = texto_anotado(ctx.anot.objetos.get(p.chave, {}), "descricao") or "_Sem anotação._"
            linhas.append(f"- **{pa['nome']}** — {pa.get('comando')} para {', '.join(pa.get('papeis') or [])}: {descricao}")
        if not politicas.get(b["id"]):
            linhas.append("- _Nenhuma política cita este bucket._")
        linhas.append("")
    soltas = politicas.get("(sem bucket identificado na condição)", [])
    if soltas:
        linhas += ["## Políticas de arquivos sem bucket identificado", ""]
        for p in sorted(soltas, key=lambda o: o.chave):
            descricao = texto_anotado(ctx.anot.objetos.get(p.chave, {}), "descricao") or "_Sem anotação._"
            linhas.append(f"- **{p.atributos['nome']}** — {p.atributos.get('comando')}: {descricao}")
        linhas.append("")
    return "\n".join(linhas)


def pagina_acesso(ctx) -> str:
    objs = ctx.inv.objetos
    linhas = [ctx.aviso(), "# Controle de acesso fora das políticas", ""]
    # Papéis
    linhas += ["## Papéis do banco", "", "| Papel | Superusuário | Faz login | Ignora RLS | Membro de | Dono / finalidade |",
               "|---|:---:|:---:|:---:|---|---|"]
    for o in sorted((o for o in objs.values() if o.tipo == "papel"), key=lambda o: o.chave):
        p = o.atributos
        texto = texto_anotado(ctx.anot.objetos.get(o.chave, {}), "finalidade")
        linhas.append(f"| {codigo(p['papel'])} | {'sim' if p['superusuario'] else ''} | {'sim' if p['pode_logar'] else ''} | "
                      f"{'**sim**' if p['ignora_rls'] else ''} | {celula(', '.join(p.get('membro_de') or []))} | "
                      f"{celula(descrever_dono(ctx, o.chave) + (' — ' + texto if texto else ''))} |")
    linhas.append("")
    # Privilégios em tabelas
    matriz = defaultdict(dict)
    for p in ctx.inv.secoes.get("permissoes_tabelas", []):
        matriz[p["tabela"]][p["papel"]] = p["privilegios"]
    linhas += ["## Privilégios em tabelas e views, por papel", "",
               "Quem tem o privilégio ainda passa pelas políticas de acesso (RLS) de cada tabela.", "",
               "| Tabela | " + " | ".join(PAPEIS_API) + " |", "|---|" + "---|" * len(PAPEIS_API)]
    for tabela in sorted(matriz):
        linhas.append(f"| [{tabela}](tabelas/{tabela}.md) | "
                      + " | ".join(celula(matriz[tabela].get(p, "")) for p in PAPEIS_API) + " |")
    linhas.append("")
    # Funções executáveis sem login
    sem_login = sorted({p["funcao"] for p in ctx.inv.secoes.get("permissoes_funcoes", []) if p["papel"] in ("anon", "PUBLIC")})
    linhas += ["## Funções executáveis por usuário não autenticado (`anon` ou `PUBLIC`)", ""]
    linhas += [f"- [{f}](funcoes/{f}.md)" for f in sem_login] or ["- _nenhuma_"]
    linhas.append("")
    # Privilégios padrão e de coluna
    linhas += ["## Privilégios padrão", "", "| Dono | Esquema | Objeto | Privilégios |", "|---|---|---|---|"]
    for p in sorted(ctx.inv.secoes.get("privilegios_padrao", []), key=lambda p: (p["dono"], p["esquema"] or "", p["tipo_objeto"] or "")):
        linhas.append(f"| {codigo(p['dono'])} | {codigo(p['esquema'])} | {p['tipo_objeto']} | "
                      f"{celula(', '.join(p.get('privilegios') or []))} |")
    linhas += ["", "## Privilégios por coluna", ""]
    colunas = ctx.inv.secoes.get("privilegios_colunas", [])
    linhas += [f"- `{p['tabela']}.{p['coluna']}` para {p['papel']}: {p['privilegios']}" for p in colunas] or [
        "_Nenhum privilégio de coluna diferente do da tabela._"]
    linhas.append("")
    # Segredos
    linhas += ["## Segredos guardados no banco (só os nomes)", ""]
    for o in sorted((o for o in objs.values() if o.tipo == "segredo"), key=lambda o: o.chave):
        nome = o.atributos["nome"]
        usam = sorted({f"[{f.atributos['nome']}](funcoes/{f.atributos['nome']}.md)" for f in objs.values()
                       if f.tipo == "funcao" and nome in (f.atributos.get("definicao") or "")})
        texto = texto_anotado(ctx.anot.objetos.get(o.chave, {}), "finalidade") or "_Sem anotação._"
        linhas.append(f"- **{nome}** — usado por: {', '.join(usam) or 'nenhuma função do banco'}. {texto}")
    linhas.append("")
    # Plataforma
    linhas += ["## Extensões", ""]
    for o in sorted((o for o in objs.values() if o.tipo == "extensao"), key=lambda o: o.chave):
        linhas.append(f"- `{o.atributos['nome']}` {o.atributos['versao']} (esquema {o.atributos['esquema']}) — "
                      f"{descrever_dono(ctx, o.chave)}")
    linhas += ["", "## Event triggers", ""]
    for o in sorted((o for o in objs.values() if o.tipo == "evento"), key=lambda o: o.chave):
        linhas.append(f"- `{o.atributos['nome']}` ({o.atributos['evento']}) → `{o.atributos['funcao']}` — "
                      f"{descrever_dono(ctx, o.chave)}")
    linhas.append("")
    return "\n".join(linhas)


def pagina_tipos(ctx) -> str:
    linhas = [ctx.aviso(), "# Tipos", ""]
    tipos = sorted((o for o in ctx.inv.objetos.values() if o.tipo == "tipo"), key=lambda o: o.chave)
    for o in tipos:
        t = o.atributos
        usado = sorted({f"[{c['tabela']}](tabelas/{c['tabela']}.md).`{c['coluna']}`"
                        for c in ctx.inv.secoes.get("colunas", []) if c["tipo"].split("[")[0] == t["nome"]})
        texto = texto_anotado(ctx.anot.objetos.get(o.chave, {}), "finalidade") or "_Sem anotação._"
        linhas += [f"## {t['nome']}", "", f"- **Espécie**: {t['tipo']}",
                   f"- **Valores**: {', '.join(codigo(v) for v in (t.get('valores') or []))}",
                   f"- **Usado em**: {', '.join(usado) or '—'}", f"- **Dono**: {descrever_dono(ctx, o.chave)}", "",
                   f"**Finalidade**: {texto}", ""]
    if not tipos:
        linhas.append("_Nenhum tipo próprio._")
    return "\n".join(linhas)


def pagina_externos(ctx) -> str:
    linhas = [ctx.aviso(), "# Informações do sistema atual que não estão no banco", "",
              "Necessárias às specs de módulo (FR-023), mas fora do alcance dos inventários do banco.", ""]
    for e in ctx.anot.externos:
        linhas += [f"## {e['nome']}", "", e["descricao"].strip(), "", f"**Como obter**: {e['como_obter'].strip()}", ""]
        if e.get("usado_por"):
            linhas += [f"**Usado por**: {', '.join(e['usado_por'])}", ""]
    if not ctx.anot.externos:
        linhas.append("_Nenhuma registrada em anotacoes/externos.toml._")
    return "\n".join(linhas)
