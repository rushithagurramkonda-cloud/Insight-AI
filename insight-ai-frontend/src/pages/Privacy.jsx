import { Link } from 'react-router-dom';
import { Logo } from '../components/ui.jsx';

const Section = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="text-lg font-semibold text-ink">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <div className="min-h-full bg-white">
      <header className="flex h-14 items-center justify-between border-b border-line px-6">
        <Link to="/"><Logo /></Link>
        <Link to="/login" className="text-sm font-medium text-brand">Sign in</Link>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Privacy & Terms</h1>
        <p className="mt-2 text-sm text-ink-mute">What Insight AI stores, what it does not, and how to delete your data.</p>

        <Section title="What is stored">
          <ul className="list-disc space-y-1 pl-5">
            <li>Your GitHub username, name and avatar.</li>
            <li>Resumes you upload, and the text extracted from them.</li>
            <li>GitHub analysis results, saved job descriptions, comparisons and job matches.</li>
            <li>Generated reports and your notifications.</li>
          </ul>
        </Section>
        <Section title="What is not stored">
          <p>Your GitHub access token is never stored in plain text and is never sent to your browser.</p>
        </Section>
        <Section title="How AI is used">
          <p>Resume and repository content is sent to the Gemini API for analysis. These calls are made only from our server, never from your browser.</p>
        </Section>
        <Section title="Deleting your data">
          <p>Open Profile, then use <strong>Delete all my data</strong> to remove every analysis, resume, job, match and report but keep your account, or <strong>Delete account</strong> to remove everything.</p>
        </Section>
        <Section title="Terms of use">
          <p>Insight AI gives AI-generated guidance. Scores and recommendations are estimates, so check important details yourself before sharing them with employers.</p>
        </Section>
        <Link to="/" className="mt-10 inline-block text-sm font-medium text-brand">Back to home</Link>
      </main>
    </div>
  );
}
