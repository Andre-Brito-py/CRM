# Implantação de IA Gratuita (Google Gemini)

Implementei uma camada de abstração de IA que permite utilizar o **Google Gemini 1.5 Flash** (nível gratuito) em todo o sistema, mantendo a compatibilidade total com a OpenAI.

## O que foi feito

### 1. Serviço de IA Unificado
Criei o serviço centralizado em `src/lib/server/ai/index.js` que gerencia a alternância automática entre Google e OpenAI.
- **Chat**: Autopilot, Sugestões de Resposta, Próximos Passos.
- **Visão**: Extração de texto de imagens no WhatsApp.
- **Áudio**: Transcrição de mensagens de voz no WhatsApp.

### 2. Refatoração Completa do Sistema
Todos os endpoints que utilizavam OpenAI foram atualizados para usar este novo serviço:
- ✅ **Autopilot**: Chatbot automático agora pode ser 100% gratuito.
- ✅ **Resumos**: Sumarização de conversas.
- ✅ **Sugestão de Resposta**: Respostas inteligentes no chat.
- ✅ **Negócios**: "Próximos Passos" e "Mensagens de Follow-up".
- ✅ **Pipeline**: Insights estratégicos e probabilidade de fechamento.
- ✅ **WhatsApp**: Processamento de áudio e imagem agora suportam Gemini.

## Como Ativar o Nível Gratuito

1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Crie uma nova **API Key**.
3.  Adicione a chave às suas variáveis de ambiente (Vercel ou arquivo `.env` local):
    ```env
    GOOGLE_AI_API_KEY=sua_chave_aqui
    ```

## Vantagens
- **Custo Zero**: O Gemini 1.5 Flash possui um limite gratuito generoso para testes e pequenos volumes.
- **Flexibilidade**: Se você configurar a `GOOGLE_AI_API_KEY`, o sistema a priorizará. Se remover, ele volta para a OpenAI automaticamente.
- **Multimodal**: O CRM agora entende áudios e fotos sem cobrar créditos da OpenAI Whisper/Vision.

---
*O sistema está pronto para ser testado em ambiente de staging ou desenvolvimento sem preocupações com custos de API.*
