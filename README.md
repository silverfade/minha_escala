# Minha Escala

Previsão de folgas para organizar a rotina, com calendário mensal e funcionamento offline.

O Minha Escala parte de uma folga conhecida e repete o ciclo de trabalho informado até o mês escolhido. A proposta é facilitar a consulta aos próximos dias de descanso, inclusive quando o ciclo atravessa meses e anos.

**Projeto pessoal em evolução, desenvolvido com apoio do Codex.** A previsão é feita por um algoritmo determinístico em JavaScript; não utiliza um modelo de inteligência artificial para calcular a escala.

## O que você pode fazer

- Configurar ciclos fixos, folgas alternadas ou um ciclo personalizado.
- Consultar o calendário e os blocos de folga de cada mês.
- Digitar o mês final ou selecioná-lo em um calendário de mês e ano.
- Mostrar ou ocultar as marcações locais de feriados de data fixa, sem alterar a escala.
- Guardar a configuração no navegador quando o armazenamento estiver disponível.
- Receber um aviso se a configuração salva não puder ser restaurada ou se uma nova gravação falhar.
- Preparar a escala para impressão e escolher salvar como PDF, quando o navegador oferecer esse destino.

## Abrir e usar

1. Baixe os arquivos do projeto mantendo a estrutura de pastas.
2. Abra [index.html](index.html) no navegador. No Windows, também é possível usar `Abrir Escala.cmd`.
3. Entre em **Escala**, escolha o modelo e informe o **primeiro dia de um bloco de folga conhecido**.
4. Ajuste os dias de trabalho e de folga conforme o modelo. No mês final, digite `MM/AAAA` ou use **Calendário** para escolher mês e ano.
5. Clique em **Calcular minha escala** e navegue pelos meses no início do aplicativo.

A versão web não exige instalação de pacotes, servidor, conta ou conexão com a internet. Node.js é usado para os testes e scripts, não para abrir a interface. A persistência ao abrir arquivos locais depende do navegador; um aviso informa quando a gravação falha.

## Modelos e exemplo

| Modelo | Comportamento |
|---|---|
| Alternado, apresentado como 6/1 → 6/2 | Alterna blocos de um e dois dias de folga. Os dias de trabalho permanecem editáveis. |
| 6/1, 6/2, 5/2 e 4/2 | Repete a quantidade indicada de dias de trabalho e de folga. |
| Personalizado | Ciclo fixo com 1 a 31 dias de trabalho e 1 a 31 dias de folga. |

Por exemplo, com referência em **08/10/2026**, uma folga inicial de um dia e seis dias de trabalho no modo alternado:

| Datas | Situação |
|---|---|
| 08/10 | Folga |
| 09 a 14/10 | Trabalho |
| 15 e 16/10 | Folga |
| 17 a 22/10 | Trabalho |
| 23/10 | Folga |

O ciclo segue continuamente: não reinicia na segunda-feira nem na virada do mês. A referência é incluída; dias anteriores a ela ficam sem classificação. O cálculo termina no último dia do mês final, cortando blocos que ultrapassarem esse limite.

## Como foi construído

| Parte | Tecnologia e decisão |
|---|---|
| Interface | HTML, CSS e JavaScript, sem framework ou dependências de execução. |
| Cálculo | Módulo independente do DOM, com datas civis processadas em UTC para evitar deslocamentos por fuso e horário de verão. |
| Estado local | `localStorage`, validação antes da restauração e avisos de falha na leitura ou gravação. |
| Testes | Node.js com módulos nativos, incluindo `node:test`, `assert` e `vm`. |
| Android | Código Java/WebView que reutiliza o frontend; fontes disponíveis em [android/](android/README.md). |

O uso de IA apoiou a implementação, a revisão e a elaboração de testes. A preparação para publicação incluiu reproduzir a falha de restauração antes de corrigi-la, tratar falhas de gravação e melhorar a seleção do mês final. A separação do cálculo e da interface permite testar as regras sem depender de um navegador.

## Verificação

Na pasta do projeto, com Node.js disponível:

```sh
node tests/schedule.test.cjs
node --test tests/recovery.test.cjs
```

Na conferência desta preparação, com Node.js v24.20.0:

- **16 asserções do cálculo passaram**, cobrindo ciclos, continuidade entre meses/anos, fevereiro bissexto e entradas inválidas.
- **44 testes da interface e persistência passaram**, cobrindo recuperação, gravação indisponível e escolha do mês final.

A segunda suíte executa o código real com um simulador de DOM e armazenamento. Esses resultados não substituem testes de aparência, toque, teclado real, leitor de tela ou Android/WebView.

## Escopo e limitações

- A previsão depende de uma referência correta e de um ciclo constante. Não incorpora trocas pontuais, férias ou exceções de jornada.
- As quantidades representam dias, não horas. O aplicativo não verifica regras trabalhistas nem transforma automaticamente 5/2 em segunda a sexta.
- Os feriados são informativos e vêm de uma tabela local de datas fixas; não há atualização automática nem cobertura de todas as datas locais ou móveis.
- Não há conta, sincronização ou backup de configurações. Limpar dados do navegador pode remover o que foi salvo. Se uma gravação falhar, a consulta continua na sessão, mas a próxima abertura pode recuperar uma configuração anterior.
- O limite de cálculo é de aproximadamente dez anos por vez. A aplicação não mantém histórico de mudanças de ciclo.
- “Hoje” é definido ao abrir o aplicativo, e a restauração começa no mês da referência. Melhorias para sessões longas e consulta ao mês atual estão pendentes.
- A impressão depende do navegador/serviço disponível; paginação e uso em Android ainda precisam de conferência prática. A revisão visual das mudanças recentes também permanece pendente.

## Estrutura principal

```text
index.html             Entrada web
src/app.js             Interface, estado, calendário e impressão
src/schedule.js        Regras de cálculo
src/holidays.js        Tabela local de feriados
src/*.css              Apresentação, cartão da escala e impressão
assets/landscape.svg   Recurso visual local
tests/                 Testes e roteiro de navegador
scripts/               Geração de HTML portátil e preparação Android
android/               Fontes Java, manifesto e recursos
```

Esta preparação contém fontes, testes e documentação. Não inclui APK, HTML portátil gerado, ferramentas Android ou chaves de assinatura. A existência de um APK de teste anterior não comprova a validação das mudanças recentes no aparelho. Não há download de APK ou demonstração hospedada anunciados nesta versão da apresentação.

## Licença

A licença ainda não foi definida nesta preparação. A escolha e a conferência da origem dos recursos visuais serão concluídas antes da publicação.

