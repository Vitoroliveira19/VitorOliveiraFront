# Projeto Power BI — Consulta de Propostas

Este é um **projeto Power BI (`.pbip`)**: o formato aberto que o Power BI Desktop abre e salva como um relatório normal. O modelo, as 28 medidas e os 29 visuais das duas páginas já estão montados.

## Como abrir

1. Baixe a pasta `powerbi/` inteira (os arquivos se referenciam entre si — não abra só o `.pbip`).
2. Dê duplo clique em **`Propostas.pbip`**.
3. O Power BI Desktop abre com as duas páginas prontas: **Consulta** e **Visão geral**.

Se a sua versão do Desktop for mais antiga e reclamar do formato, ative em
*Arquivo → Opções e configurações → Opções → Recursos de visualização*:
**"Salvar como projeto do Power BI (.pbip)"** e **"Armazenar relatórios usando o formato de metadados aprimorado"**. Reinicie e abra de novo.

Para salvar como `.pbix` normal depois: *Arquivo → Salvar como → Arquivo do Power BI (.pbix)*.

## Apontando para os seus dados

O projeto vem com 48 propostas de exemplo **embutidas na consulta M**, para que o relatório abra funcionando de cara. Para usar a sua base:

1. *Página Inicial → Transformar dados* → selecione a consulta **Propostas**.
2. No Editor Avançado, troque a etapa `Origem` pela sua fonte. Está marcada com um comentário `TROQUE ESTA ETAPA PELA SUA FONTE DE DADOS`.
3. Mantenha os **nomes das colunas** iguais: `ID_proposta`, `segmento`, `volume_capturado`, `taxa_bruta_porc`, `irv_final_pricing_porc`, `proposta_convertida`, `irv_clm`, `mdr_clm`, `motivo`, `observacao`.

Três regras que as medidas assumem:

- **Percentuais como decimal.** 1,42% precisa chegar como `0,0142`. Se a sua base guarda `1,42`, divida por 100 no Power Query.
- **`proposta_convertida`** é texto `"Sim"` / `"Não"`.
- **`irv_clm` e `mdr_clm` ficam nulos** nas propostas não convertidas — não preencha com zero, senão as médias ponderadas ficam diluídas.

## O que tem em cada página

**Consulta** — segmentação de `ID_proposta` com caixa de pesquisa e seleção única; três cartões do bloco Recomendado (`volume_capturado`, `taxa_bruta_porc`, `irv_final_pricing_porc`); e o bloco Proposta convertida com o selo de situação, IRV CLM, MDR CLM, motivo, observação e o desvio em pontos percentuais contra o recomendado.

**Visão geral** — taxa de conversão, volume proposto × convertido, spread médio, motivos de perda, conversão por faixa de volume, comparação IRV recomendado × fechado e a tabela completa.

## Se algo não abrir

**Não consegui testar este projeto** — não há Power BI neste ambiente. A estrutura PBIP/PBIR/TMDL foi montada e todos os 39 arquivos JSON validam, mas se o Desktop recusar algum arquivo, me diga a mensagem de erro exata que eu corrijo.

Caminhos de contorno, se precisar:

- **O tema não veio aplicado:** *Exibição → Temas → Procurar temas* → `../tema-powerbi.json`.
- **Um visual específico falhou:** apague ele e recrie seguindo o `../GUIA-POWER-BI.md`, que tem posição, tamanho e campos de cada um.
- **O modelo não carregou:** crie um relatório em branco e cole as medidas de `../medidas.dax` uma a uma; o guia cobre a montagem manual completa.

## Regenerando

`node ../gerar-pbip.js` reconstrói esta pasta a partir de `../dados.json`, `../tema-powerbi.json` e das definições no próprio script. Se você editar o relatório no Desktop, **não rode o gerador de novo** — ele sobrescreve.

## Sobre o `powerbi-modeling-mcp`

O [servidor MCP de modelagem da Microsoft](https://github.com/microsoft/powerbi-modeling-mcp) opera sobre pastas PBIP como esta. Se você rodar o Claude Code na sua máquina com esse MCP configurado, ele consegue alterar o **modelo semântico** deste projeto por conversa — criar medidas, renomear colunas, ajustar relacionamentos. Ele não mexe em páginas nem em visuais; para isso, o arquivo a editar é `Propostas.Report/definition/pages/…/visual.json`.
