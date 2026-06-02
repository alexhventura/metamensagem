import { Link, useLocation, useNavigate } from 'react-router-dom';

/** True when pathname is the app home route (`/`). */
export function isHomePath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return path === '/';
}

/** Site-wide logo + title — always navigates to `/` (home). */
export default function HeaderBrandLink() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = isHomePath(pathname);

  return (
    <Link
      to="/"
      onClick={(e) => {
        if (isHome) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        e.preventDefault();
        navigate('/', { replace: false });
        window.scrollTo({ top: 0, behavior: 'auto' });
      }}
      className="flex items-center gap-2.5 group min-w-0 flex-shrink-0 cursor-pointer no-underline"
      aria-label="Metamensagem, pagina inicial"
    >
      <img
        src="/brand/logo.svg"
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 md:h-10 md:w-10 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
        decoding="async"
      />
      <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#A855F7] to-[#6366f1] tracking-tighter truncate pointer-events-none">
        Metamensagem
      </span>
    </Link>
  );
}
