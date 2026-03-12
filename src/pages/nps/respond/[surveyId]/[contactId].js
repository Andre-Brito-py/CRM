import prisma from '@/prisma/index';
import Meta from '@/components/Meta';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const RespondNps = ({ survey, contact }) => {
  const router = useRouter();
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => typeof score === 'number' && score >= 0 && score <= 10 && !isSubmitting, [score, isSubmitting]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/nps/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          contactId: contact.id,
          score,
          feedback_text: feedback || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.msg || 'Erro ao enviar resposta');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err?.message || 'Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  if (router.isFallback) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Meta title={`NPS - ${survey.name}`} />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-executive font-bold tracking-tight">{survey.name}</h1>
            <p className="mt-2 text-sm text-white/70">
              Olá {contact.name}. Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa para um amigo?
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 p-6">
              <h2 className="text-lg font-bold">Obrigado pelo seu feedback.</h2>
              <p className="mt-2 text-sm text-white/70">Sua resposta foi registrada com sucesso.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <div className="grid grid-cols-11 gap-2">
                  {Array.from({ length: 11 }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setScore(idx)}
                      className={[
                        'h-10 rounded-xl border text-sm font-bold transition-all',
                        score === idx
                          ? 'bg-indigo-500/20 border-indigo-400/40 text-white'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {idx}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-white/50">
                  <span>Nada provável</span>
                  <span>Muito provável</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Feedback (opcional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Conte um pouco mais sobre sua nota..."
                />
              </div>

              {error ? (
                <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'w-full rounded-2xl px-5 py-3 text-sm font-bold transition-all',
                  canSubmit ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-white/10 text-white/40 cursor-not-allowed',
                ].join(' ')}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar resposta'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Este formulário é seguro e coleta apenas sua avaliação e feedback.
        </p>
      </div>
    </div>
  );
};

export const getServerSideProps = async (ctx) => {
  const { surveyId, contactId } = ctx.params;

  const [survey, contact] = await Promise.all([
    prisma.npsSurvey.findUnique({
      where: { id: `${surveyId}` },
      select: { id: true, name: true, workspaceId: true },
    }),
    prisma.contact.findUnique({
      where: { id: `${contactId}` },
      select: { id: true, name: true, workspaceId: true },
    }),
  ]);

  if (!survey || !contact || survey.workspaceId !== contact.workspaceId) {
    return { notFound: true };
  }

  return {
    props: {
      survey: { id: survey.id, name: survey.name },
      contact: { id: contact.id, name: contact.name },
    },
  };
};

export default RespondNps;

