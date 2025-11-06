"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-6 animate-fade-in">
          <div className="inline-block">
            <span className="text-6xl md:text-7xl">🧵</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
            Cyclea
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Genera prendas de ropa personalizadas usando inteligencia artificial
            a partir de tus telas favoritas
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href={'/generador'}
            className="inline-block group relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <button className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Comenzar a Generar →
            </button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-3xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="font-semibold text-gray-900 mb-2">Sube tus telas</h3>
            <p className="text-sm text-gray-600">Carga hasta 3 imágenes de telas que te gusten</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-semibold text-gray-900 mb-2">IA Generativa</h3>
            <p className="text-sm text-gray-600">Nuestra IA crea prendas realistas con tus telas</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">👕</div>
            <h3 className="font-semibold text-gray-900 mb-2">Múltiples opciones</h3>
            <p className="text-sm text-gray-600">Genera remeras, pantalones o buzos</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
