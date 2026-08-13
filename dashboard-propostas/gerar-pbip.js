/*
 * Gera o projeto Power BI (.pbip) do dashboard de propostas.
 *   node gerar-pbip.js
 * Saída: ./powerbi/ — abra Propostas.pbip no Power BI Desktop.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, 'powerbi');
const MODELO = path.join(RAIZ, 'Propostas.SemanticModel');
const RELATORIO = path.join(RAIZ, 'Propostas.Report');

const guid = (semente) => {
  const h = crypto.createHash('sha1').update('propostas:' + semente).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const escrever = (arquivo, conteudo) => {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2) + '\n', 'utf8');
};

// =====================================================================
//  DADOS
// =====================================================================
const dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'dados.json'), 'utf8'));
const mTexto = (v) => (v == null ? 'null' : '"' + String(v).replace(/"/g, '""') + '"');
const mNum = (v) => (v == null ? 'null' : String(v));
// Percentuais viram decimal (1,42% -> 0,0142); o arredondamento evita
// que o ponto flutuante gere 0.014199999999999999 dentro do M.
const mPct = (v) => (v == null ? 'null' : String(Number((v / 100).toFixed(6))));
const linhasM = dados.map((d) => '            {' + [
  mTexto(d.id_proposta), mTexto(d.segmento), mNum(d.volume_capturado),
  mPct(d.taxa_bruta_porc), mPct(d.irv_final_pricing_porc),
  mTexto(d.proposta_convertida), mPct(d.irv_clm), mPct(d.mdr_clm),
  mTexto(d.motivo), mTexto(d.observacao),
].join(', ') + '}').join(',\n');

// =====================================================================
//  MODELO SEMÂNTICO (TMDL)
// =====================================================================
const colunas = [
  ['ID_proposta', 'string', '', 'none'],
  ['segmento', 'string', '', 'none'],
  ['volume_capturado', 'int64', '#,0', 'sum'],
  ['taxa_bruta_porc', 'double', '0.00%', 'none'],
  ['irv_final_pricing_porc', 'double', '0.00%', 'none'],
  ['proposta_convertida', 'string', '', 'none'],
  ['irv_clm', 'double', '0.00%', 'none'],
  ['mdr_clm', 'double', '0.00%', 'none'],
  ['motivo', 'string', '', 'none'],
  ['observacao', 'string', '', 'none'],
];

const medidas = [
  ['Volume Capturado', '#,0', `SUM ( Propostas[volume_capturado] )`],

  ['Taxa Bruta %', '0.00%',
`VAR Peso = SUM ( Propostas[volume_capturado] )
RETURN
    IF (
        Peso = 0,
        AVERAGE ( Propostas[taxa_bruta_porc] ),
        DIVIDE ( SUMX ( Propostas, Propostas[volume_capturado] * Propostas[taxa_bruta_porc] ), Peso )
    )`],

  ['IRV Final Pricing %', '0.00%',
`VAR Peso = SUM ( Propostas[volume_capturado] )
RETURN
    IF (
        Peso = 0,
        AVERAGE ( Propostas[irv_final_pricing_porc] ),
        DIVIDE ( SUMX ( Propostas, Propostas[volume_capturado] * Propostas[irv_final_pricing_porc] ), Peso )
    )`],

  ['IRV CLM %', '0.00%',
`VAR Base = FILTER ( Propostas, Propostas[proposta_convertida] = "Sim" && NOT ISBLANK ( Propostas[irv_clm] ) )
VAR Peso = SUMX ( Base, Propostas[volume_capturado] )
RETURN
    IF (
        Peso = 0,
        AVERAGEX ( Base, Propostas[irv_clm] ),
        DIVIDE ( SUMX ( Base, Propostas[volume_capturado] * Propostas[irv_clm] ), Peso )
    )`],

  ['MDR CLM %', '0.00%',
`VAR Base = FILTER ( Propostas, Propostas[proposta_convertida] = "Sim" && NOT ISBLANK ( Propostas[mdr_clm] ) )
VAR Peso = SUMX ( Base, Propostas[volume_capturado] )
RETURN
    IF (
        Peso = 0,
        AVERAGEX ( Base, Propostas[mdr_clm] ),
        DIVIDE ( SUMX ( Base, Propostas[volume_capturado] * Propostas[mdr_clm] ), Peso )
    )`],

  ['Situação da Proposta', '',
`VAR S = SELECTEDVALUE ( Propostas[proposta_convertida] )
RETURN
    SWITCH ( TRUE (), ISBLANK ( S ), "—", S = "Sim", "● Convertida", "● Não convertida" )`],

  ['Cor Situação', '',
`IF ( SELECTEDVALUE ( Propostas[proposta_convertida] ) = "Sim", "#0CA30C", "#D03B3B" )`],

  ['Motivo', '',
`IF (
    HASONEVALUE ( Propostas[ID_proposta] ),
    SELECTEDVALUE ( Propostas[motivo] ),
    "Selecione um ID de proposta"
)`],

  ['Observação', '',
`IF ( HASONEVALUE ( Propostas[ID_proposta] ), SELECTEDVALUE ( Propostas[observacao] ), "" )`],

  ['Desvio IRV', '0.00%',
`IF ( NOT ISBLANK ( [IRV CLM %] ), [IRV CLM %] - [IRV Final Pricing %] )`],

  ['Desvio MDR', '0.00%',
`IF ( NOT ISBLANK ( [MDR CLM %] ), [MDR CLM %] - [Taxa Bruta %] )`],

  ['Desvio IRV (rótulo)', '',
`VAR D = [Desvio IRV]
RETURN IF ( ISBLANK ( D ), "", FORMAT ( D * 100, "+0.00;-0.00;0.00" ) & " p.p. vs. recomendado" )`],

  ['Desvio MDR (rótulo)', '',
`VAR D = [Desvio MDR]
RETURN IF ( ISBLANK ( D ), "", FORMAT ( D * 100, "+0.00;-0.00;0.00" ) & " p.p. vs. taxa bruta" )`],

  ['Cor Desvio IRV', '',
`VAR D = [Desvio IRV]
RETURN SWITCH ( TRUE (), ISBLANK ( D ), "#8996A8", D >= 0, "#0CA30C", "#D03B3B" )`],

  ['Cor Desvio MDR', '',
`VAR D = [Desvio MDR]
RETURN SWITCH ( TRUE (), ISBLANK ( D ), "#8996A8", D >= 0, "#0CA30C", "#D03B3B" )`],

  ['Título da Consulta', '',
`VAR Id = SELECTEDVALUE ( Propostas[ID_proposta] )
RETURN IF ( ISBLANK ( Id ), "Nenhuma proposta selecionada", "Proposta " & Id )`],

  ['Aviso Seleção', '',
`IF (
    NOT HASONEVALUE ( Propostas[ID_proposta] ),
    "Digite um ID no filtro de busca acima para carregar a proposta."
)`],

  ['Qtd Propostas', '#,0', `COUNTROWS ( Propostas )`],
  ['Qtd Convertidas', '#,0', `CALCULATE ( COUNTROWS ( Propostas ), Propostas[proposta_convertida] = "Sim" )`],
  ['Qtd Não Convertidas', '#,0', `CALCULATE ( COUNTROWS ( Propostas ), Propostas[proposta_convertida] = "Não" )`],
  ['Taxa de Conversão %', '0.0%', `DIVIDE ( [Qtd Convertidas], [Qtd Propostas] )`],
  ['Volume Convertido', '#,0', `CALCULATE ( [Volume Capturado], Propostas[proposta_convertida] = "Sim" )`],
  ['Conversão em Volume %', '0.0%', `DIVIDE ( [Volume Convertido], [Volume Capturado] )`],

  ['Resumo Conversão', '',
`[Qtd Convertidas] & " de " & [Qtd Propostas] & " propostas recomendadas foram fechadas."`],

  ['Spread Médio IRV (p.p.)', '0.00',
`VAR Base = FILTER ( Propostas, Propostas[proposta_convertida] = "Sim" && NOT ISBLANK ( Propostas[irv_clm] ) )
RETURN AVERAGEX ( Base, Propostas[irv_clm] - Propostas[irv_final_pricing_porc] ) * 100`],

  // Ranking por volume: substitui o filtro Top N no visual de comparação.
  ['Rank Volume Convertidas', '#,0',
`IF (
    HASONEVALUE ( Propostas[ID_proposta] ),
    RANKX (
        CALCULATETABLE (
            VALUES ( Propostas[ID_proposta] ),
            Propostas[proposta_convertida] = "Sim",
            ALLSELECTED ( Propostas )
        ),
        [Volume Capturado],
        ,
        DESC
    )
)`],

  ['IRV Recomendado (Top 10) %', '0.00%',
`IF (
    NOT ISBLANK ( [IRV CLM %] ) && [Rank Volume Convertidas] <= 10,
    [IRV Final Pricing %]
)`],

  ['IRV CLM (Top 10) %', '0.00%',
`IF ( [Rank Volume Convertidas] <= 10, [IRV CLM %] )`],
];

const nomeTmdl = (n) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n) ? n : `'${n}'`);
const indentar = (txt, nivel) => txt.split('\n').map((l) => '\t'.repeat(nivel) + l).join('\n');

let tabela = `table Propostas\n\tlineageTag: ${guid('table')}\n\n`;

for (const [nome, tipo, fmt, resumo] of colunas) {
  tabela += `\tcolumn ${nomeTmdl(nome)}\n`;
  tabela += `\t\tdataType: ${tipo}\n`;
  if (fmt) tabela += `\t\tformatString: ${fmt}\n`;
  tabela += `\t\tlineageTag: ${guid('col:' + nome)}\n`;
  tabela += `\t\tsummarizeBy: ${resumo}\n`;
  tabela += `\t\tsourceColumn: ${nome}\n\n`;
  tabela += `\t\tannotation SummarizationSetBy = Automatic\n\n`;
}

// Coluna calculada de faixa
tabela += `\tcolumn 'Faixa de Volume' =\n`;
tabela += indentar(
`SWITCH (
    TRUE (),
    Propostas[volume_capturado] < 250000, "1. Até R$ 250 mil",
    Propostas[volume_capturado] < 1000000, "2. R$ 250 mil - 1 mi",
    Propostas[volume_capturado] < 2500000, "3. R$ 1 mi - 2,5 mi",
    "4. Acima de R$ 2,5 mi"
)`, 3) + '\n';
tabela += `\t\tdataType: string\n`;
tabela += `\t\tlineageTag: ${guid('col:faixa')}\n`;
tabela += `\t\tsummarizeBy: none\n\n`;
tabela += `\t\tannotation SummarizationSetBy = Automatic\n\n`;

for (const [nome, fmt, dax] of medidas) {
  const multi = dax.includes('\n');
  tabela += `\tmeasure ${nomeTmdl(nome)} =` + (multi ? '\n' + indentar(dax, 3) : ' ' + dax) + '\n';
  if (fmt) tabela += `\t\tformatString: ${fmt}\n`;
  tabela += `\t\tlineageTag: ${guid('med:' + nome)}\n\n`;
}

tabela += `\tpartition Propostas = m\n`;
tabela += `\t\tmode: import\n`;
tabela += `\t\tsource =\n`;
tabela += indentar(
`let
    // ==========================================================
    //  TROQUE ESTA ETAPA PELA SUA FONTE DE DADOS.
    //  Os nomes das colunas precisam continuar iguais.
    //  Ex.: Origem = Sql.Database("servidor", "banco"){[Item="Propostas"]}[Data]
    //  Percentuais devem chegar como decimal: 1,42% = 0,0142
    // ==========================================================
    Origem = Table.FromRows(
        {
${linhasM}
        },
        {"ID_proposta", "segmento", "volume_capturado", "taxa_bruta_porc", "irv_final_pricing_porc", "proposta_convertida", "irv_clm", "mdr_clm", "motivo", "observacao"}
    ),
    Tipado = Table.TransformColumnTypes(
        Origem,
        {
            {"ID_proposta", type text}, {"segmento", type text}, {"volume_capturado", Int64.Type},
            {"taxa_bruta_porc", type number}, {"irv_final_pricing_porc", type number},
            {"proposta_convertida", type text}, {"irv_clm", type number}, {"mdr_clm", type number},
            {"motivo", type text}, {"observacao", type text}
        }
    )
in
    Tipado`, 4) + '\n\n';

tabela += `\tannotation PBI_ResultType = Table\n`;

escrever(path.join(MODELO, 'definition', 'tables', 'Propostas.tmdl'), tabela);

escrever(path.join(MODELO, 'definition', 'database.tmdl'),
`database\n\tcompatibilityLevel: 1567\n`);

escrever(path.join(MODELO, 'definition', 'model.tmdl'),
`model Model
\tculture: pt-BR
\tdefaultPowerBIDataSourceVersion: powerBI_V3
\tsourceQueryCulture: pt-BR
\tdataAccessOptions
\t\tlegacyRedirects
\t\treturnErrorValuesAsNull

annotation PBI_QueryOrder = ["Propostas"]

ref table Propostas
`);

escrever(path.join(MODELO, 'definition.pbism'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json',
  version: '4.2',
  settings: {},
});

escrever(path.join(MODELO, '.platform'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
  metadata: { type: 'SemanticModel', displayName: 'Propostas' },
  config: { version: '2.0', logicalId: guid('modelo') },
});

// =====================================================================
//  RELATÓRIO (PBIR)
// =====================================================================
const ENTIDADE = 'Propostas';
const medida = (nome) => ({
  field: { Measure: { Expression: { SourceRef: { Entity: ENTIDADE } }, Property: nome } },
  queryRef: `${ENTIDADE}.${nome}`, nativeQueryRef: nome,
});
const coluna = (nome) => ({
  field: { Column: { Expression: { SourceRef: { Entity: ENTIDADE } }, Property: nome } },
  queryRef: `${ENTIDADE}.${nome}`, nativeQueryRef: nome,
});
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const txt = (s) => lit(`'${s}'`);
const num = (n) => lit(`${n}D`);
const bool = (b) => lit(b ? 'true' : 'false');
const cor = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const corMedida = (nome) => ({
  solid: { color: { expr: { Measure: { Expression: { SourceRef: { Entity: ENTIDADE } }, Property: nome } } } },
});

const semTitulo = { title: [{ properties: { show: bool(false) } }] };

let z = 0;
const visuais = { consulta: [], visaogeral: [] };

function add(pagina, nome, pos, visual) {
  visuais[pagina].push({ nome, json: {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/1.0.0/schema.json',
    name: nome,
    position: { x: pos[0], y: pos[1], z: z++, width: pos[2], height: pos[3], tabOrder: z * 1000 },
    visual,
  } });
}

function caixaTexto(pagina, nome, pos, runs) {
  add(pagina, nome, pos, {
    visualType: 'textbox',
    objects: { general: [{ properties: { paragraphs: [{ textRuns: runs }] } }] },
    visualContainerObjects: {
      ...semTitulo,
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      dropShadow: [{ properties: { show: bool(false) } }],
    },
  });
}

const rotulo = (t, tamanho, peso, cor_) => ({
  value: t, textStyle: { fontSize: `${tamanho}pt`, fontWeight: peso, color: cor_, fontFamily: 'Segoe UI' },
});

function cartao(pagina, nome, pos, nomeMedida, opts = {}) {
  const objetos = {
    labels: [{ properties: {
      fontSize: num(opts.tamanho || 28),
      ...(opts.corMedida ? { color: corMedida(opts.corMedida) } : { color: cor(opts.cor || '#101A29') }),
      ...(opts.alinhamento ? { alignment: txt(opts.alinhamento) } : {}),
    } }],
    categoryLabels: [{ properties: {
      show: bool(opts.categoria !== false),
      fontSize: num(9), color: cor('#5A6A80'),
    } }],
    wordWrap: [{ properties: { show: bool(true) } }],
  };
  add(pagina, nome, pos, {
    visualType: 'card',
    query: { queryState: { Values: { projections: [medida(nomeMedida)] } } },
    objects: objetos,
    visualContainerObjects: { ...semTitulo, ...(opts.contêiner || {}) },
  });
}

function segmentacao(pagina, nome, pos, nomeColuna, cabecalho, opts = {}) {
  add(pagina, nome, pos, {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [coluna(nomeColuna)] } } },
    objects: {
      data: [{ properties: { mode: txt('Dropdown') } }],
      general: [{ properties: { ...(opts.busca ? { selfFilterEnabled: bool(true) } : {}) } }],
      selection: [{ properties: { singleSelect: bool(!!opts.unico), strictSingleSelect: bool(!!opts.unico) } }],
      header: [{ properties: { show: bool(true), text: txt(cabecalho), fontSize: num(9), fontColor: cor('#5A6A80'), outline: txt('None') } }],
      items: [{ properties: { fontSize: num(11), fontColor: cor('#101A29') } }],
    },
    visualContainerObjects: semTitulo,
  });
}

function grafico(pagina, nome, pos, tipo, estado, titulo, opts = {}) {
  add(pagina, nome, pos, {
    visualType: tipo,
    query: { queryState: estado },
    objects: {
      categoryAxis: [{ properties: { showAxisTitle: bool(false), fontSize: num(10), labelColor: cor('#5A6A80') } }],
      valueAxis: [{ properties: { showAxisTitle: bool(false), show: bool(opts.eixoValor !== false), fontSize: num(9), labelColor: cor('#8996A8') } }],
      labels: [{ properties: { show: bool(opts.rotulos !== false), fontSize: num(10), color: cor('#101A29') } }],
      legend: [{ properties: { show: bool(!!opts.legenda), position: txt('Top'), showTitle: bool(false), fontSize: num(10), labelColor: cor('#5A6A80') } }],
    },
    visualContainerObjects: {
      title: [{ properties: { show: bool(true), text: txt(titulo), fontSize: num(12), fontColor: cor('#101A29'), alignment: txt('left') } }],
      ...(opts.subtitulo ? { subTitle: [{ properties: { show: bool(true), text: txt(opts.subtitulo), fontSize: num(9), fontColor: cor('#5A6A80') } }] } : {}),
    },
  });
}

// ---------------------------------------------------------------------
//  PÁGINA 1 — CONSULTA
// ---------------------------------------------------------------------
caixaTexto('consulta', 'txtTitulo1', [24, 16, 640, 56], [
  rotulo('Consulta de proposta', 18, 'bold', '#101A29'),
]);
caixaTexto('consulta', 'txtSub1', [24, 52, 760, 26], [
  rotulo('Busque pelo ID da proposta para ver o pricing recomendado e o que foi efetivamente fechado.', 10, 'normal', '#5A6A80'),
]);

segmentacao('consulta', 'slcId', [24, 84, 300, 58], 'ID_proposta', 'ID DA PROPOSTA', { busca: true, unico: true });
segmentacao('consulta', 'slcSegmento', [340, 84, 240, 58], 'segmento', 'SEGMENTO');
segmentacao('consulta', 'slcConvertida', [596, 84, 220, 58], 'proposta_convertida', 'SITUAÇÃO');

caixaTexto('consulta', 'txtRecomendado', [24, 162, 300, 24], [
  rotulo('RECOMENDADO', 9, 'bold', '#8996A8'),
]);
cartao('consulta', 'cardVolume', [24, 190, 400, 138], 'Volume Capturado', { tamanho: 32 });
cartao('consulta', 'cardTaxa', [440, 190, 400, 138], 'Taxa Bruta %', { tamanho: 32 });
cartao('consulta', 'cardIrv', [856, 190, 400, 138], 'IRV Final Pricing %', { tamanho: 32 });

caixaTexto('consulta', 'txtConvertida', [24, 346, 300, 24], [
  rotulo('PROPOSTA CONVERTIDA', 9, 'bold', '#8996A8'),
]);
cartao('consulta', 'cardTitulo', [24, 374, 700, 60], 'Título da Consulta', { tamanho: 16, categoria: false, alinhamento: 'left' });
cartao('consulta', 'cardSituacao', [740, 374, 516, 60], 'Situação da Proposta', { tamanho: 14, categoria: false, corMedida: 'Cor Situação', alinhamento: 'left' });

cartao('consulta', 'cardIrvClm', [24, 448, 300, 122], 'IRV CLM %', { tamanho: 26 });
cartao('consulta', 'cardIrvDesvio', [24, 536, 300, 34], 'Desvio IRV (rótulo)', { tamanho: 10, categoria: false, corMedida: 'Cor Desvio IRV' });
cartao('consulta', 'cardMdrClm', [340, 448, 300, 122], 'MDR CLM %', { tamanho: 26 });
cartao('consulta', 'cardMdrDesvio', [340, 536, 300, 34], 'Desvio MDR (rótulo)', { tamanho: 10, categoria: false, corMedida: 'Cor Desvio MDR' });
cartao('consulta', 'cardMotivo', [656, 448, 600, 122], 'Motivo', { tamanho: 13, alinhamento: 'left' });
cartao('consulta', 'cardObservacao', [24, 586, 1232, 108], 'Observação', { tamanho: 12, alinhamento: 'left' });

// ---------------------------------------------------------------------
//  PÁGINA 2 — VISÃO GERAL
// ---------------------------------------------------------------------
caixaTexto('visaogeral', 'txtTitulo2', [24, 16, 700, 56], [
  rotulo('Visão geral da carteira', 18, 'bold', '#101A29'),
]);
caixaTexto('visaogeral', 'txtSub2', [24, 52, 860, 26], [
  rotulo('Como as propostas recomendadas estão convertendo e onde o pricing fechado se afasta do recomendado.', 10, 'normal', '#5A6A80'),
]);

cartao('visaogeral', 'cardConversao', [24, 82, 400, 90], 'Taxa de Conversão %', { tamanho: 40 });
cartao('visaogeral', 'cardResumo', [24, 168, 400, 46], 'Resumo Conversão', { tamanho: 10, categoria: false });
cartao('visaogeral', 'cardVolTotal', [440, 82, 268, 132], 'Volume Capturado', { tamanho: 24 });
cartao('visaogeral', 'cardVolConv', [724, 82, 268, 132], 'Volume Convertido', { tamanho: 24 });
cartao('visaogeral', 'cardSpread', [1008, 82, 248, 132], 'Spread Médio IRV (p.p.)', { tamanho: 24 });

grafico('visaogeral', 'grfMotivos', [24, 230, 616, 224], 'barChart', {
  Category: { projections: [coluna('motivo')] },
  Y: { projections: [medida('Qtd Não Convertidas')] },
}, 'Por que as propostas não fecham', { subtitulo: 'Propostas não convertidas, por motivo registrado', eixoValor: false });

grafico('visaogeral', 'grfFaixas', [656, 230, 600, 224], 'hundredPercentStackedBarChart', {
  Category: { projections: [coluna('Faixa de Volume')] },
  Y: { projections: [medida('Qtd Propostas')] },
  Series: { projections: [coluna('proposta_convertida')] },
}, 'Conversão por faixa de volume', { subtitulo: 'Participação de propostas convertidas em cada faixa', legenda: true });

grafico('visaogeral', 'grfIrv', [24, 470, 616, 226], 'clusteredBarChart', {
  Category: { projections: [coluna('ID_proposta')] },
  Y: { projections: [medida('IRV Recomendado (Top 10) %'), medida('IRV CLM (Top 10) %')] },
}, 'IRV recomendado × IRV fechado', { subtitulo: '10 maiores propostas convertidas, por volume', legenda: true, rotulos: false });

add('visaogeral', 'tblPropostas', [656, 470, 600, 226], {
  visualType: 'tableEx',
  query: { queryState: { Values: { projections: [
    coluna('ID_proposta'), coluna('segmento'), medida('Volume Capturado'),
    medida('Taxa Bruta %'), medida('IRV Final Pricing %'), coluna('proposta_convertida'),
    medida('IRV CLM %'), medida('MDR CLM %'), coluna('motivo'),
  ] } } },
  objects: {
    columnHeaders: [{ properties: { fontSize: num(9), fontColor: cor('#5A6A80'), backColor: cor('#F6F8FB') } }],
    values: [{ properties: { fontSize: num(10), fontColor: cor('#101A29') } }],
    grid: [{ properties: { gridVertical: bool(false), gridHorizontal: bool(true), rowPadding: num(4) } }],
  },
  visualContainerObjects: {
    title: [{ properties: { show: bool(true), text: txt('Todas as propostas'), fontSize: num(12), fontColor: cor('#101A29'), alignment: txt('left') } }],
  },
});

// ---------------------------------------------------------------------
//  Gravar o relatório
// ---------------------------------------------------------------------
const paginas = [
  { nome: 'consulta', titulo: 'Consulta' },
  { nome: 'visaogeral', titulo: 'Visão geral' },
];

for (const p of paginas) {
  escrever(path.join(RELATORIO, 'definition', 'pages', p.nome, 'page.json'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/1.0.0/schema.json',
    name: p.nome,
    displayName: p.titulo,
    displayOption: 'FitToPage',
    height: 720,
    width: 1280,
  });
  for (const v of visuais[p.nome]) {
    escrever(path.join(RELATORIO, 'definition', 'pages', p.nome, 'visuals', v.nome, 'visual.json'), v.json);
  }
}

escrever(path.join(RELATORIO, 'definition', 'pages', 'pages.json'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json',
  pageOrder: paginas.map((p) => p.nome),
  activePageName: 'consulta',
});

escrever(path.join(RELATORIO, 'definition', 'report.json'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/1.0.0/schema.json',
  themeCollection: { customTheme: { name: 'tema-propostas', type: 'RegisteredResources' } },
  layoutOptimization: 'None',
  resourcePackages: [{
    name: 'RegisteredResources',
    type: 'RegisteredResources',
    items: [{ name: 'tema-propostas.json', path: 'tema-propostas.json', type: 'CustomTheme' }],
  }],
});

const tema = JSON.parse(fs.readFileSync(path.join(__dirname, 'tema-powerbi.json'), 'utf8'));
tema.name = 'tema-propostas';
escrever(path.join(RELATORIO, 'StaticResources', 'RegisteredResources', 'tema-propostas.json'), tema);

escrever(path.join(RELATORIO, 'definition.pbir'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json',
  version: '4.0',
  datasetReference: { byPath: { path: '../Propostas.SemanticModel' } },
});

escrever(path.join(RELATORIO, '.platform'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
  metadata: { type: 'Report', displayName: 'Propostas' },
  config: { version: '2.0', logicalId: guid('relatorio') },
});

escrever(path.join(RAIZ, 'Propostas.pbip'), {
  $schema: 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json',
  version: '1.0',
  artifacts: [{ report: { path: 'Propostas.Report' } }],
  settings: { enableAutoRecovery: true },
});

const totalVisuais = paginas.reduce((a, p) => a + visuais[p.nome].length, 0);
console.log(`OK — ${medidas.length} medidas, ${paginas.length} páginas, ${totalVisuais} visuais, ${dados.length} linhas embutidas.`);
