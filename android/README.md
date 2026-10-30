# Minha Escala para Android

Este diretório contém as fontes de um invólucro Java/WebView que carrega o frontend local do Minha Escala. O manifesto define Android 8/API 26 como versão mínima e API 35 como alvo.

**Esta cópia de preparação não inclui APK, ferramentas Android, intermediários de compilação ou chaves de assinatura.** As mudanças recentes de recuperação, avisos de gravação e seletor de mês foram testadas no JavaScript, mas não compiladas ou homologadas no Android.

## O que consta nas fontes

- O manifesto não declara permissões Android e desabilita backup automático e depuração do aplicativo.
- A Activity habilita JavaScript e armazenamento local da WebView, bloqueia navegação externa e restringe acesso a arquivos e conexões.
- O HTML embarcado é carregado com uma origem HTTPS local para identificar o documento e seu armazenamento; essa origem não é um serviço hospedado do projeto.
- A ponte JavaScript expõe a impressão pelo serviço do Android. O destino PDF depende das opções do aparelho.

Essas são observações do código-fonte, não uma certificação de segurança, compatibilidade ou comportamento de um pacote compilado. A configuração salva na WebView é separada da configuração do navegador.

## Estrutura

```text
app/src/main/AndroidManifest.xml
app/src/main/java/br/com/minhaescala/app/MainActivity.java
app/src/main/res/
```

Os scripts relacionados ficam em `../scripts/`:

- `setup-android.ps1`: preparação local do JDK e SDK, incluindo downloads e conferência de hashes.
- `build-apk.ps1`: geração do HTML portátil, compilação Java/DEX, empacotamento, alinhamento, assinatura e verificações previstas pelo script.
- `build-portable.cjs`: incorpora os recursos web no HTML usado pela distribuição portátil.

Esses scripts foram preservados para revisão; não foram executados nesta preparação. A execução futura cria arquivos e, na preparação de ferramentas, acessa a rede. Não é necessária para abrir a versão web.

## Situação da distribuição

Há registro de uma versão de teste anterior usada no celular do proprietário. Esse relato não equivale à validação desta revisão. O script atual prevê uma identidade de assinatura de teste, com senha padrão pública; não foi incluída chave nesta cópia e essa configuração não representa uma identidade de produção aprovada.

Continuam pendentes a revisão do pipeline, a política de versões e assinatura, a compilação autorizada e os testes de interface, persistência e impressão no aparelho. A distribuição de APK será tratada separadamente. Para usar e verificar a versão web, consulte o [README principal](../README.md).
