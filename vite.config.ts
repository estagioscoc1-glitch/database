import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 2500,

      // ARQUIVOS MENORES, DE PROPÓSITO.
      //
      // O painel administrativo estava saindo num único arquivo de 1,9 MB.
      // Num computador da escola, esse arquivo — e SÓ ele — passou a ser
      // barrado no download: o portal abria e depois quebrava com
      // "Failed to fetch dynamically imported module". Todos os outros
      // arquivos, de 39 a 328 kB, carregavam normalmente.
      //
      // Programa de segurança que inspeciona download costuma engasgar em
      // arquivo grande de script. Separando as bibliotecas em pedaços de
      // algumas centenas de kB, nenhum deles fica no tamanho que provoca isso.
      //
      // Ganho secundário: o navegador reaproveita as bibliotecas entre
      // publicações, em vez de rebaixar 1,9 MB toda vez que mudamos uma linha.
      // SEPARAÇÃO DE ARQUIVOS: TENTADA E REVERTIDA.
      //
      // O painel administrativo sai num arquivo de 1,9 MB, e num computador da
      // escola esse arquivo — só ele — era barrado no download, quebrando o
      // portal. Separar as bibliotecas pesadas reduziu o arquivo para 1,1 MB,
      // mas a página passou a abrir em branco.
      //
      // A causa da tela branca não chegou a ser identificada. O que se sabe é
      // que sem esta separação o portal funciona, e com ela não funciona — e
      // portal quebrado é pior que portal pesado.
      //
      // Se for retomado: aplicar UMA biblioteca por vez, publicando e testando
      // entre cada uma, em vez de todas de uma vez como foi feito aqui.
    },
  };
});
