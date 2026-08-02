/**
 * O assistente rodando no Cloudflare.
 *
 * O portal, no computador da escola, é servido por um Express (`server.ts`).
 * O Cloudflare não executa Express — ele roda funções isoladas, uma por
 * endereço. Este arquivo é a versão Cloudflare da única rota de API que o
 * sistema tem: `/api/helper-bot`.
 *
 * A LÓGICA NÃO ESTÁ AQUI, de propósito. Ela vive em `src/lib/assistente.ts`,
 * usada tanto por este arquivo quanto pelo `server.ts`. Se as respostas
 * fossem copiadas nos dois, um dia alguém corrigiria só um lado e o
 * assistente passaria a responder diferente conforme onde o portal estivesse
 * rodando — o tipo de divergência que ninguém percebe até dar problema.
 */

import { responderAssistente } from "../../src/lib/assistente";

const PAPEIS = ["admin", "teacher", "student"];

export const onRequestPost: PagesFunction = async ({ request }) => {
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });

  let dados: any;
  try {
    dados = await request.json();
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const { message, role } = dados ?? {};

  // As mesmas validações do servidor local: a mensagem entra no texto de
  // resposta, então não pode vir vazia nem gigante, e o papel precisa ser um
  // dos três conhecidos.
  if (typeof message !== "string" || message.trim() === "") {
    return json({ error: "Mensagem vazia." }, 400);
  }
  if (message.length > 1000) {
    return json({ error: "Pergunta muito longa. Resuma em até 1000 caracteres." }, 400);
  }
  if (role !== undefined && !PAPEIS.includes(String(role))) {
    return json({ error: "Perfil inválido." }, 400);
  }

  return json({ text: responderAssistente(message, role) });
};

// Qualquer outro método (GET, PUT...) não faz sentido aqui.
export const onRequest: PagesFunction = async ({ request, next }) => {
  if (request.method !== "POST") {
    return new Response("Método não permitido.", { status: 405 });
  }
  return next();
};
