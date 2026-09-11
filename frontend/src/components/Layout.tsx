import type { ReactNode } from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        ArogyaAI provides preliminary healthcare assistance and general
        information. It does not replace a qualified healthcare professional.
      </footer>
    </div>
  );
}
