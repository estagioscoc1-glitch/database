import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { responderAssistente } from "./src/lib/assistente";

// CARREGAR AS VARIÁVEIS DE AMBIENTE
//
// Sem isto, `process.env.GEMINI_API_KEY` chegava vazio e o assistente caía
// SEMPRE no texto pronto de emergência — respondia qualquer pergunta com o
// mesmo parágrafo genérico, e o pior: como o texto de emergência assume aluno
// quando não reconhece o perfil, o administrador recebia instruções da tela do
// aluno. O Vite lê o `.env.local` sozinho para o navegador; o servidor, não.
dotenv.config({ path: ".env.local" });
dotenv.config();   // também aceita um `.env` comum, se existir

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Necessário para o limitador enxergar o IP real atrás do proxy da hospedagem
  app.set("trust proxy", 1);

  // Detecta o ambiente ANTES de montar a segurança, porque a CSP muda entre os dois.
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.argv[1] && (process.argv[1].includes("server.cjs") || process.argv[1].includes("dist")));

  // ------------------------------------------------------------------
  // Cabeçalhos de segurança HTTP.
  // O servidor antigo não enviava nenhum: sem CSP, sem proteção contra
  // clickjacking, sem HSTS. Qualquer XSS virava comprometimento total.
  //
  // A CSP é RÍGIDA em produção. Em desenvolvimento ela precisa ser mais
  // frouxa, senão bloqueia o próprio Vite: ele injeta um script inline na
  // página e abre um WebSocket (ws://localhost) para recarregar sozinho.
  // Sem essa distinção, a tela fica em branco no modo dev.
  // ------------------------------------------------------------------
  const origensConexao = ["'self'", "https://*.supabase.co", "wss://*.supabase.co"];
  if (!isProduction) {
    origensConexao.push("ws://localhost:*", "http://localhost:*", "ws://127.0.0.1:*");
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // 'unsafe-inline'/'unsafe-eval' SOMENTE em desenvolvimento (exigido pelo Vite).
          scriptSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],   // Tailwind injeta estilos inline
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: origensConexao,
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],               // impede embutir o portal em iframe
          baseUri: ["'self'"],
          formAction: ["'self'"],
          ...(isProduction ? {} : { upgradeInsecureRequests: null }),
        },
      },
      crossOriginEmbedderPolicy: false,
      // HSTS só faz sentido em produção com HTTPS; em localhost atrapalha.
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  // Limite de tamanho do corpo: sem isso, um POST gigante derruba o servidor.
  app.use(express.json({ limit: "100kb" }));

  // ------------------------------------------------------------------
  // Limite de uso do assistente.
  // A rota estava aberta e sem limite: qualquer pessoa na internet podia
  // chamá-la em laço e consumir a cota paga da API do Gemini.
  // ------------------------------------------------------------------
  const limiteAssistente = rateLimit({
    windowMs: 5 * 60 * 1000,     // 5 minutos
    limit: 20,                   // 20 perguntas por IP nesse intervalo
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Muitas perguntas em pouco tempo. Aguarde alguns minutos." },
  });

  // Interactive Helper Bot AI route
  app.post("/api/helper-bot", limiteAssistente, async (req: express.Request, res: express.Response) => {
    const { message, role, userName } = req.body;

    if (typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Mensagem vazia." });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: "Pergunta muito longa. Resuma em até 1000 caracteres." });
    }
    // Só os três papéis conhecidos são aceitos — o valor entra no prompt da IA.
    if (role !== undefined && !["admin", "teacher", "student"].includes(String(role))) {
      return res.status(400).json({ error: "Perfil inválido." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // RESPOSTAS SEM IA
      //
      // A chave da Gemini está vazia no .env.local — por opção, para o
      // assistente não depender de serviço externo nem gerar custo. Então ele
      // responde por palavra-chave, com textos escritos à mão.
      //
      // O conteúdo abaixo foi conferido no sistema rodando: nomes de aba,
      // caminhos e regras de nota. O texto que estava aqui antes citava telas
      // que não existem ("Registros Acadêmicos") e dizia que os backups ficam
      // no Firebase, que foi removido do projeto.
      //
      // Se um dia a chave for preenchida, a IA assume automaticamente e este
      // bloco deixa de ser usado.
      // A lógica vive em src/lib/assistente.ts, compartilhada com a versão
      // que roda no Cloudflare. Uma cópia só, para não divergirem.
      const reply = responderAssistente(message, role as any);

      return res.json({ text: reply });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `
Você é o LYNX Assistente do Portal Acadêmico do Colégio Oswaldo Cruz (COC).
Seu único objetivo é responder diretamente a perguntas de suporte técnico ou de uso da plataforma feitas pelo usuário atual, cujo nome é "${String(userName || 'Usuário').replace(/[^\p{L}\p{N} .\-]/gu, '').slice(0, 60)}" e tem a função de "${role}".

Diretrizes estritas de resposta:
1. Responda de forma extremamente objetiva, direta e simples, sem enrolação, sem saudações redundantes ou vazias ("Olá, como posso ajudar", "Olá Administrador", etc.) e sem perguntas ou sugestões de conversação ao final.
2. Não forneça menus, tópicos ou listas de alternativas de diálogo. Apenas responda a pergunta do usuário e encerre a resposta.
3. Não invente nenhuma funcionalidade. Baseie-se estritamente na realidade do sistema:

   REGRAS DE NOTA (valem para todos os cursos):
     * S1 = AV1 + AV2 + AV3, limitado a 30 pontos. A Rec S1 SUBSTITUI a menor das três (só se for maior), não soma.
     * S2 = AV4 + AV5 + AV6, limitado a 30 pontos. A Rec S2 funciona igual.
     * AFC vale até 40 pontos. Lançada em UMA disciplina, ela se repete automaticamente em todas as disciplinas daquele módulo para aquele aluno.
     * Nota final PF = S1 + S2 + AFC + Extra + Conselho, limitado a 100. Aprovado com PF de 60 ou mais.
     * Reprova por falta quem tiver frequência abaixo de 75% da carga horária da disciplina. Isso vale mesmo com nota boa.
     * Conceitos: A de 86 a 100, B de 76 a 85, C de 60 a 75, D de 0 a 59.
     * Resultados possíveis no boletim: APTO, NÃO APTO, REP. FALTAS, Pendente, DISPENSADO, DESISTENTE.

   - Alunos:
     * Login é a matrícula. No primeiro acesso a senha também é a matrícula, e o sistema OBRIGA a trocar por uma senha pessoal (mínimo 8 caracteres, com letra e número). O usuário continua sendo a matrícula para sempre.
     * Notas, médias e faltas estão na aba 'Aproveitamento'.
     * Declarações (Escolaridade/Matrícula, Transporte, Vacina) são emitidas na hora na aba 'Solicitar Declarações'.
     * Estágios (horas, local, notas) na aba 'Meus Estágios'. Sem local ou nota, aparece laranja como "PENDENTE".
     * Envio de documentos (RG, CPF, Diploma) na aba de documentos.

   - Professores:
     * O professor só enxerga as turmas e disciplinas que o administrador atribuiu a ele. Se abrir sem nenhuma, precisa pedir a atribuição à secretaria.
     * Lançar notas: botão 'Lançar Notas (Abrir Janela)', preencher a planilha e clicar em 'Salvar Notas'. Sem clicar em salvar, nada é gravado.
     * Frequência: aba 'Frequência (Chamadas)'.
     * Registro de aulas: aba 'Diário de Classe'.
     * Prazos: alertas no topo do painel. Passado o prazo, o diário é bloqueado automaticamente e só o administrador reabre.

   - Administradores e Secretaria:
     * Cadastrar professor ou funcionário: 'Cadastros Acadêmicos' → 'Turmas, Professores & Alunos'. A senha é gerada pelo servidor e aparece UMA única vez na confirmação — anote e entregue à pessoa.
     * Definir o que cada professor acessa: mesma tela, seção 'Gerenciador de Acessos de Professores'. Sem isso o professor não vê turma nenhuma. A mesma disciplina não pode ter dois professores.
     * Matricular aluno: mesma tela. Ao matricular, o aluno entra automaticamente em TODOS os diários da turma.
     * Importar planilha de alunos: aba 'Importar Planilhas'. Escolher primeiro o SEMESTRE, depois a TURMA. O sistema lê apenas matrícula e nome; o que estiver no cabeçalho do arquivo é ignorado.
     * Criar acesso dos alunos importados: botão 'Gerar acessos'. Cria o login de cada um com a matrícula como usuário e senha.
     * Transferir aluno: 'Movimentação' → 'Transferências'. Só a transferência de TURMA move o aluno de verdade; a de turno sozinha não move, porque turno é característica da turma.
     * Marcar aluno como DISPENSADO ou DESISTENTE: dentro da planilha de notas, coluna Resultado (só o administrador vê esse seletor).
     * Prazos de fechamento (S1, S2, definitivo e conselho): aba 'Dashboard', cartão 'Programação de Prazos & Fechamento Automático'. Essas datas travam o lançamento de notas de toda a escola.
     * Boletim: aba 'Boletim Completo', busca por matrícula ou nome.
     * Backups: aba 'Backup & Segurança'. Os dados ficam no Supabase (PostgreSQL), não em Firebase.
4. Suas respostas devem ser COMPLETAS, mas extremamente enxutas, curtas e sem enrolação. Nunca interrompa o texto no meio de uma frase.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `O usuário perguntou: "${message}"` }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          maxOutputTokens: 2500,
        }
      });

      const replyText = response.text || "Desculpe, não consegui processar sua resposta no momento.";
      return res.json({ text: replyText });
    } catch (error) {
      console.error("Erro na chamada do Gemini API:", error);
      return res.status(500).json({ error: "Erro interno ao processar inteligência artificial." });
    }
  });

  // (isProduction já foi definido lá em cima, junto da configuração da CSP)

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Development catch-all route to serve and transform index.html
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Como o server.cjs compilado fica dentro da pasta 'dist' em produção,
    // o __dirname aponta diretamente para '/app/applet/dist'.
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Production catch-all route to serve the built index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
