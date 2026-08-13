# Dashboard de Consulta de Propostas — guia de montagem no Power BI

Duas páginas:

1. **Consulta** — busca por `ID_proposta`, mostra o bloco **Recomendado** e o bloco **Proposta convertida**.
2. **Visão geral** — leitura da carteira inteira: conversão, motivos de perda e desvio do pricing fechado.

O protótipo em `index.html` é a referência visual (abra no navegador). Os arquivos de apoio:

| Arquivo | Para que serve |
|---|---|
| `medidas.dax` | Todas as medidas, prontas para colar |
| `tema-powerbi.json` | Tema do relatório (cores, tipografia, cartões, tabelas) |
| `dados_exemplo.csv` | 48 linhas de exemplo, caso queira montar antes de plugar sua base |
| `index.html` | Protótipo navegável do resultado final |

> **Premissa assumida:** existe uma tabela única chamada `Propostas` com as colunas
> `ID_proposta`, `volume_capturado`, `taxa_bruta_porc`, `irv_final_pricing_porc`,
> `proposta_convertida`, `irv_clm`, `mdr_clm`, `motivo`, `observacao` — uma linha por proposta.
> Se na sua base o CLM estiver numa tabela separada, veja a nota no fim do Passo 1.

---

## Passo 1 — Preparar o modelo

No **Power Query**, antes de carregar:

1. **Percentuais.** Se `taxa_bruta_porc`, `irv_final_pricing_porc`, `irv_clm` e `mdr_clm` estão gravados como `1,42` (querendo dizer 1,42%), divida cada uma por 100 → *Transformar → Padrão → Dividir → 100*. Depois marque o tipo como **Número decimal**.
   No modelo, selecione cada coluna e defina **Formato = Porcentagem, 2 casas decimais**.
   Isso importa: sem isso, os cartões vão mostrar `0,01` ou `142%`.

2. **`proposta_convertida`** precisa ser texto com dois valores consistentes: `"Sim"` / `"Não"`. Se hoje vier como `1/0` ou `TRUE/FALSE`, converta com *Coluna Condicional*. As medidas do arquivo `.dax` comparam com `"Sim"` — se você usar outro rótulo, ajuste lá.

3. **`ID_proposta`** deve ser **Texto**. Se for número, o slicer de busca fica com separador de milhar (`24.500` em vez de `24500`).

4. **`volume_capturado`** → Número decimal, formato **Moeda R$**, 0 casas decimais.

5. **`irv_clm` / `mdr_clm`** ficam **em branco** nas propostas não convertidas. Não preencha com zero — as medidas dependem do branco para não diluir as médias.

Carregado o modelo, crie a **coluna calculada** que a página 2 usa (última seção do `medidas.dax`):

```dax
Faixa de Volume =
SWITCH (
    TRUE (),
    Propostas[volume_capturado] < 250000,  "1. Até R$ 250 mil",
    Propostas[volume_capturado] < 1000000, "2. R$ 250 mil – 1 mi",
    Propostas[volume_capturado] < 2500000, "3. R$ 1 mi – 2,5 mi",
                                           "4. Acima de R$ 2,5 mi"
)
```

Ajuste os cortes para as faixas que fazem sentido na sua carteira.

> **Se o CLM estiver em outra tabela:** crie um relacionamento **1:1** ou **1:N** de `Propostas[ID_proposta]` para `CLM[ID_proposta]`, com direção de filtro **única** (Propostas → CLM). Nas medidas `IRV CLM %` e `MDR CLM %`, troque o `FILTER ( Propostas, … )` por `FILTER ( CLM, NOT ISBLANK ( CLM[irv_clm] ) )` e use `RELATED ( Propostas[volume_capturado] )` como peso.

---

## Passo 2 — Aplicar o tema

*Exibição → Temas → Procurar temas* → selecione `tema-powerbi.json`.

Ele já define: fundo da página cinza-azulado, cartões brancos com borda e canto arredondado de 10 px, tipografia Segoe UI, azul `#2A78D6` como cor de dados, e verde/vermelho reservados para status (`#0CA30C` / `#D03B3B`). As instruções de posicionamento abaixo assumem o tema aplicado.

---

## Passo 3 — Criar as medidas

Abra `medidas.dax` e crie cada medida (*Modelagem → Nova medida*). O arquivo está dividido em seis blocos comentados; os blocos 1–4 servem à página Consulta, o bloco 5 à página Visão geral.

Duas coisas que valem atenção:

- **`Taxa Bruta %` e `IRV Final Pricing %` são médias ponderadas pelo volume.** Com um único ID selecionado — que é o uso da tela de consulta — elas devolvem exatamente o valor daquela linha. Com vários IDs, entregam a média correta em vez de uma média simples que trata uma proposta de R$ 50 mil igual a uma de R$ 5 milhões.
- **`Desvio IRV (rótulo)` multiplica por 100** porque a diferença entre dois percentuais se lê em **pontos percentuais**, não em porcentagem.

---

## Passo 4 — Página "Consulta"

Canvas **1280 × 720** (*Formato da página → Tamanho do canvas → Personalizado*).

### 4.1 A busca por ID (o ponto central da tela)

Insira uma **Segmentação de dados** com o campo `Propostas[ID_proposta]`:

1. *Formato → Configurações da segmentação → Opções → Estilo* = **Lista suspensa**.
2. Clique nos **`…`** do cabeçalho do visual → **Pesquisar**. É isso que transforma o slicer numa caixa de busca: o usuário digita `24500` e a lista filtra enquanto ele escreve.
3. *Formato → Seleção* → ative **Selecionar apenas um item**. Sem isso, dá para marcar dois IDs e os cartões viram média de duas propostas.
4. Cabeçalho: renomeie para **"ID DA PROPOSTA"**, fonte 9 pt semibold.
5. Deixe o visual **largo** (300 px) — é o elemento que a pessoa procura primeiro.

Ao lado, mais duas segmentações auxiliares em lista suspensa: `segmento` e `proposta_convertida` (esta é o "filtre o recomendado" — permite ver só as convertidas ou só as perdidas).

Por fim, um **Botão → Redefinir** (*Inserir → Botões → Redefinir*) rotulado **"Limpar"**, que devolve a página ao estado inicial.

### 4.2 Layout dos visuais

| Visual | Conteúdo | X, Y | L × A |
|---|---|---|---|
| Caixa de texto | `Consulta de proposta` (18 pt bold) + linha de apoio (10 pt) | 24, 20 | 600 × 52 |
| Segmentação | `ID_proposta` — lista suspensa **com pesquisa**, seleção única | 24, 84 | 300 × 58 |
| Segmentação | `segmento` | 340, 84 | 240 × 58 |
| Segmentação | `proposta_convertida` | 596, 84 | 200 × 58 |
| Botão Redefinir | "Limpar" | 812, 84 | 110 × 58 |
| Caixa de texto | `RECOMENDADO` (9 pt, maiúsculas, espaçamento largo, cinza) | 24, 162 | 300 × 22 |
| **Cartão** | `[Volume Capturado]` | 24, 190 | 400 × 138 |
| **Cartão** | `[Taxa Bruta %]` | 440, 190 | 400 × 138 |
| **Cartão** | `[IRV Final Pricing %]` | 856, 190 | 400 × 138 |
| Caixa de texto | `PROPOSTA CONVERTIDA` | 24, 346 | 300 × 22 |
| **Cartão** | `[Título da Consulta]` e `[Situação da Proposta]` | 24, 374 | 1232 × 60 |
| **Cartão** | `[IRV CLM %]` | 24, 448 | 300 × 122 |
| **Cartão** | `[MDR CLM %]` | 340, 448 | 300 × 122 |
| **Cartão** | `[Motivo]` | 656, 448 | 600 × 122 |
| **Cartão** | `[Observação]` | 24, 586 | 1232 × 108 |

Use o visual **Cartão (novo)** — o que aceita *rótulos de referência*. Nos três cartões do bloco Recomendado, deixe o valor em 32 pt bold e o rótulo de categoria em 9 pt cinza.

### 4.3 Os detalhes que fazem a tela funcionar

**Delta no cartão de IRV CLM.** No Cartão (novo) → *Rótulos de referência* → adicione `[Desvio IRV (rótulo)]` como **Título** do rótulo. Em *Cor da fonte* → **fx** → *Formatar por: Valor do campo* → escolha `[Cor Desvio IRV]`. O texto aparece verde quando o fechado ficou acima do recomendado e vermelho quando ficou abaixo. Repita no cartão de MDR com `[Desvio MDR (rótulo)]` e `[Cor Desvio MDR]`.

**Selo Convertida / Não convertida.** No cartão do título, o valor `[Situação da Proposta]` já vem com um `●` na frente. Aplique *Cor da fonte → fx → Valor do campo → `[Cor Situação]`*. Assim o estado é lido pela forma **e** pela cor — quem não distingue verde de vermelho ainda lê a palavra.

**Estado vazio.** Enquanto nenhum ID é escolhido, os cartões mostram valores agregados da carteira inteira, o que confunde. Duas saídas, da mais simples à mais elegante:

- *Simples:* coloque uma caixa de texto com `[Aviso Seleção]` sobre o bloco Convertida. Ela some sozinha quando um ID é selecionado.
- *Completa:* crie dois **indicadores** (*Exibição → Indicadores*) — um com os blocos visíveis, outro com só a mensagem — e alterne com o painel *Seleção*. Dá mais trabalho e fica bem melhor.

**Botão de detalhamento (opcional).** Se quiser abrir a proposta a partir da página 2, ative *Formato da página → Drill-through* nesta página e arraste `ID_proposta` para o campo de detalhamento. Aí, clicar com o botão direito numa linha da tabela da Visão geral leva direto para a proposta.

---

## Passo 5 — Página "Visão geral"

Mesmo canvas 1280 × 720.

| Visual | Conteúdo | X, Y | L × A |
|---|---|---|---|
| Caixa de texto | `Visão geral da carteira` + linha de apoio | 24, 20 | 640 × 52 |
| **Cartão** | `[Taxa de Conversão %]` (44 pt) + `[Resumo Conversão]` como rótulo de referência | 24, 82 | 400 × 132 |
| **Cartão** | `[Volume Capturado]` | 440, 82 | 268 × 132 |
| **Cartão** | `[Volume Convertido]` | 724, 82 | 268 × 132 |
| **Cartão** | `[Spread Médio IRV (p.p.)]` | 1008, 82 | 248 × 132 |
| **Barras empilhadas horizontais** | Motivos de perda | 24, 230 | 616 × 224 |
| **Barras 100% empilhadas horizontais** | Conversão por faixa | 656, 230 | 600 × 224 |
| **Barras agrupadas horizontais** | IRV recomendado × fechado | 24, 470 | 616 × 226 |
| **Tabela** | Todas as propostas | 656, 470 | 600 × 226 |

### 5.1 "Por que as propostas não fecham"

Visual: **Gráfico de barras empilhadas** (horizontal).

- Eixo Y: `motivo` · Eixo X: `[Qtd Propostas]`
- **Filtro no visual:** `proposta_convertida` = `Não` (painel Filtros → Filtros neste visual).
- Ordene por `[Qtd Propostas]` decrescente (`…` → *Classificar eixo*).
- *Formato → Rótulos de dados* → **Ativado**. Barra horizontal com rótulo direto dispensa o eixo de valores — desligue-o para limpar a tela.
- Cor única azul. Não use uma cor diferente por motivo: aqui a barra já codifica a grandeza, e cores categóricas só somariam ruído.

### 5.2 "Conversão por faixa de volume"

Visual: **Gráfico de barras 100% empilhadas** (horizontal).

- Eixo Y: `Faixa de Volume` · Eixo X: `[Qtd Propostas]` · Legenda: `proposta_convertida`
- Cores: **Sim** = `#2A78D6` (azul), **Não** = `#C2CBD8` (cinza). Só o que converteu recebe cor; o resto é fundo. É o mesmo princípio do protótipo.
- Rótulos de dados ativados.

### 5.3 "IRV recomendado × IRV fechado"

Visual: **Gráfico de barras agrupadas** (horizontal).

- Eixo Y: `ID_proposta` · Valores: `[IRV Final Pricing %]` **e** `[IRV CLM %]`
- Filtro no visual: `proposta_convertida` = `Sim`, e *Filtro N Principal* = **10 principais por `[Volume Capturado]`** — sem isso o visual vira uma lista de centenas de barras ilegíveis.
- **Não use o visual "Linha e coluna agrupada".** As duas medidas são percentuais na mesma escala; colocá-las em dois eixos Y diferentes faz a comparação visual mentir. Um eixo só.

### 5.4 Tabela

Colunas, nesta ordem: `ID_proposta`, `segmento`, `[Volume Capturado]`, `[Taxa Bruta %]`, `[IRV Final Pricing %]`, `proposta_convertida`, `[IRV CLM %]`, `[MDR CLM %]`, `motivo`.

Na coluna `proposta_convertida`: *Formatação condicional → Cor da fonte → Formatar por: Valor do campo → `[Cor Situação]`*.

Se você ativou o drill-through no Passo 4, botão direito numa linha → *Detalhar → Consulta* abre a proposta na página 1.

---

## Passo 6 — Conferir antes de publicar

- [ ] Escolher um ID no slicer muda os três cartões do bloco Recomendado.
- [ ] Uma proposta **não convertida** mostra IRV CLM e MDR CLM em branco (não zero) e o motivo da perda.
- [ ] Os deltas mudam de cor corretamente: verde acima do recomendado, vermelho abaixo.
- [ ] Sem nenhum ID selecionado, aparece a mensagem de orientação em vez de números agregados.
- [ ] O slicer de ID está com **seleção única** ativada.
- [ ] `[Taxa de Conversão %]` bate com a contagem manual de `proposta_convertida = "Sim"`.
- [ ] Os percentuais aparecem como `1,42%` — não `0,01%` nem `142%`.
- [ ] Nenhum visual usa dois eixos Y.

---

## Sobre os dados de exemplo

`dados_exemplo.csv` tem 48 propostas fictícias (`;` como separador, vírgula decimal, UTF-8 com BOM — abre direto no Excel pt-BR). Serve para montar e testar o relatório antes de apontar para a base real. Ao trocar a fonte, os nomes de coluna são os mesmos, então as medidas continuam válidas.
