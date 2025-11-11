import { WalletButton } from "@/components/WalletButton";
import { BuilderScore } from "@/components/BuilderScore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/20 to-transparent">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="mx-[200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              🚀 Builder Checker App
            </h1>
            <div className="flex items-center gap-6">
              <Link
                href="/leaderboard"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/search"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Search
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      <section className="text-center py-16 bg-gradient-to-br from-accent/20 to-transparent rounded-3xl mb-10 mx-[200px] mt-8">
        <h1 className="text-4xl font-bold mb-3">🚀 Builder Checker App</h1>
        <p className="text-lg opacity-80 mb-6">Verify onchain builders & check your reputation instantly.</p>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-accent text-white rounded-xl font-medium shadow-md hover:opacity-90">
            Connect Wallet
          </button>
          <button className="px-6 py-3 border border-accent text-accent rounded-xl font-medium hover:bg-accent/10">
            Explore Builders
          </button>
        </div>
      </section>

      <main className="mx-[200px] px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Builder Score
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Connect your wallet to view your onchain builder reputation score powered by Talent Protocol
          </p>
        </div>

        <BuilderScore />

        <section className="mt-16">
          <h2 className="text-2xl font-semibold mb-4">🏆 Top Builders This Week</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {['0xAlice', '0xBob', '0xCharlie'].map((addr, i) => (
              <div key={addr} className="p-4 rounded-xl bg-white/80 backdrop-blur-sm shadow dark:bg-gray-800/80 border border-gray-200/50">
                <p className="font-semibold text-lg">{addr}</p>
                <p className="text-accent font-bold text-2xl">Score {90 - i * 5}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center py-6 text-sm opacity-70 mt-16">
          © {new Date().getFullYear()} Builder Checker App — Built for onchain creators 💜
        </footer>
      </main>
    </div>
  );
}
