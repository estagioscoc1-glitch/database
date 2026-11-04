import React from 'react';

/**
 * Orientações de estágio / atividades avaliativas — texto da gerência de estágio (pedido de 04/11/2026),
 * mostrado ao aluno no portal (aba "Orientações Estágios"). Só leitura: não grava nada em lugar nenhum.
 */

const Lista = ({ itens, tipo = 'ul' }: { itens: React.ReactNode[]; tipo?: 'ul' | 'ol' }) => {
  const Tag = tipo;
  return (
    <Tag className={`${tipo === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed`}>
      {itens.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </Tag>
  );
};

const Texto = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>
);

const Subtitulo = ({ children }: { children: React.ReactNode }) => (
  <h5 className="font-extrabold text-slate-800 dark:text-white text-sm pt-1">{children}</h5>
);

const Destaque = ({ tom, children }: { tom: 'amber' | 'red'; children: React.ReactNode }) => (
  <div
    className={`rounded-2xl border p-4 space-y-2 ${
      tom === 'amber'
        ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
        : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
    }`}
  >
    {children}
  </div>
);

export default function OrientacoesEstagioAluno() {
  return (
    <div className="space-y-5 animate-fade-in" id="orientacoes-estagio-aluno">
      <h3 className="font-extrabold text-slate-800 dark:text-white text-base">📚 ORIENTAÇÕES – ESTÁGIO / ATIVIDADES AVALIATIVAS</h3>

      {/* PRIMEIRO ESTÁGIO */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-3">
        <h4 className="font-black text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide">✅ PRIMEIRO ESTÁGIO – Assistência em Tratamento Especializado</h4>
        <Texto>Carga horária correspondente: 120 horas.</Texto>

        <Texto>🔹 Será necessário realizar no mínimo 03 capacitações on-line e gratuitas:</Texto>
        <Lista itens={['02 capacitações de 30 horas;', '01 capacitação de 60 horas.']} />

        <Subtitulo>📝 RELATÓRIO DESCRITIVO DO ESTÁGIO</Subtitulo>
        <Texto>
          Vocês deverão elaborar um relatório crítico-reflexivo <strong>MANUSCRITO</strong>, descrevendo o que compreenderam sobre cada capacitação realizada.
        </Texto>

        <Destaque tom="amber">
          <p className="font-extrabold text-amber-800 dark:text-amber-300 text-sm">⚠️ IMPORTANTE:</p>
          <Lista
            itens={[
              'Não quero textos copiados do Google, TCC ou inteligência artificial;',
              'Quero que escrevam com as próprias palavras, demonstrando o que realmente entenderam;',
              'Em cada capacitação deverá ser feito um relatório separado;',
              'Ao final de cada relatório, deverão constar os cuidados de enfermagem relacionados ao tema estudado.',
            ]}
          />
        </Destaque>

        <Subtitulo>📌 Estrutura do relatório:</Subtitulo>
        <Lista
          tipo="ol"
          itens={[
            'Título da capacitação realizada;',
            'Descrição do que foi compreendido sobre o tema, utilizando suas palavras;',
            'Cuidados de enfermagem relacionados ao assunto.',
          ]}
        />

        <Destaque tom="red">
          <p className="text-sm font-bold text-red-800 dark:text-red-300 leading-relaxed">
            ❌ Não utilizar a palavra “curso” no texto, pois esse relatório será considerado equivalente ao estágio.
          </p>
        </Destaque>

        <Texto>
          <strong>⏰ Prazo para entrega: 15 dias.</strong>
        </Texto>
        <Texto>📍 A entrega será realizada exclusivamente em via WhatsApp da gerente de estágio.</Texto>
        <Texto>
          A apresentação oral será solicitada apenas caso eu identifique indícios de cópia ou perceba dúvidas em relação ao entendimento do conteúdo apresentado pelo aluno.
        </Texto>
      </section>

      {/* TRABALHO – CME */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-3">
        <h4 className="font-black text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide">🏥 TRABALHO – CME (Central de Material e Esterilização)</h4>
        <Texto>
          O trabalho deverá ser <strong>DIGITADO</strong> e seguir obrigatoriamente a seguinte sequência:
        </Texto>

        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <li>1️⃣ Explicar o fluxo unidirecional da CME;</li>
          <li>2️⃣ Descrever sobre as RDCs relacionadas à CME;</li>
          <li>3️⃣ Fazer uma analogia com o Controle de Infecção Hospitalar;</li>
          <li>
            4️⃣ Explicar as etapas de:
            <ul className="list-disc pl-8 mt-1 space-y-0.5">
              <li>Limpeza;</li>
              <li>Desinfecção;</li>
              <li>Esterilização;</li>
            </ul>
          </li>
          <li>5️⃣ Relacionar as 6 Metas Internacionais de Segurança do Paciente dentro da CME;</li>
          <li>6️⃣ Explicar as funções do Técnico de Enfermagem na CME;</li>
          <li>7️⃣ Conclusão.</li>
        </ul>

        <Texto>
          📝 Após finalizar o trabalho digitado, deverá ser feito também um relatório <strong>MANUSCRITO</strong> sobre o que foi compreendido.
        </Texto>

        <Texto>📲 A entrega deverá ser enviada pelo WhatsApp em:</Texto>
        <Lista itens={['PDF; ou', 'Foto legível.']} />

        <Destaque tom="red">
          <p className="text-sm font-bold text-red-800 dark:text-red-300">❌ NÃO precisa imprimir nada.</p>
        </Destaque>
      </section>
    </div>
  );
}
