/**
 * FONTE DOS DOCUMENTOS OFICIAIS.
 *
 * Vale para declarações, históricos, diplomas e certificados — os documentos
 * que a escola entrega assinados ao aluno. Ficam todos num lugar só para que
 * trocar a fonte seja uma linha, e não uma caçada por vários arquivos.
 *
 * NÃO vale para o contrato nem para a ficha de estágio: aqueles seguem o
 * formato dos modelos próprios deles e não foram incluídos no pedido.
 *
 * Está em Times New Roman. Para trocar para Arial, basta usar a constante
 * FONTE_ARIAL abaixo no lugar desta — a mudança pega em todos os documentos
 * de uma vez.
 */

export const FONTE_TIMES = '"Times New Roman", Times, serif';
export const FONTE_ARIAL = 'Arial, Helvetica, sans-serif';

/** A que está valendo hoje nos documentos oficiais. */
export const FONTE_DOCUMENTOS = FONTE_TIMES;
