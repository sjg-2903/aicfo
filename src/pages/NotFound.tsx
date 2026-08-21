import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-gray-600 mt-2">Page not found</p>
        <Link to="/" className="text-blue-600 mt-4 inline-block">
          Go home
        </Link>
      </div>
    </div>
  );
}
