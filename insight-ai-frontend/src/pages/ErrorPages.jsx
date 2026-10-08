import { Link } from 'react-router-dom';
import { Logo } from '../components/ui.jsx';

function ErrorPage({ code, title, text }) {
  return (
    <div className="bg-grid flex min-h-full flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <p className="text-6xl font-bold text-brand">{code}</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-mute">{text}</p>
      <Link to="/dashboard" className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
        Back to dashboard
      </Link>
    </div>
  );
}

export const NotFound = () => <ErrorPage code="404" title="Page not found" text="The page you are looking for does not exist or has moved." />;
export const Forbidden = () => <ErrorPage code="403" title="You do not have access" text="This area is only available to administrators." />;
export const ServerError = () => <ErrorPage code="500" title="Something went wrong" text="We hit an unexpected problem. Try again in a moment." />;
