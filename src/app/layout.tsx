import "./globals.css";

export const metadata = {
  title: "InterPrep",
  description: "Jobs → Fit → Plan → Practice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a href="/dashboard" className="brand">
              <span className="dot" /> InterPrep
            </a>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/jobs">Jobs</a>
              <a href="/practice/today">Practice</a>
              <a href="/skills">Skills</a>
              <a href="/cv">CV</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
