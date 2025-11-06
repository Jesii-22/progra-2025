"use client";
import { useState } from "react";

export default function GeneradorPage() {
    const [files, setFiles] = useState([null, null, null]);
    const [previews, setPreviews] = useState([null, null, null]);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

    const handleFileChange = (index, file) => {
        const newFiles = [...files];
        const newPreviews = [...previews];

        if (file) {
            newFiles[index] = file;
            newPreviews[index] = URL.createObjectURL(file);
        } else {
            newFiles[index] = null;
            if (newPreviews[index]) {
                URL.revokeObjectURL(newPreviews[index]);
            }
            newPreviews[index] = null;
        }

        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    const generar = async (tipo) => {
        // Verificar si hay archivos
        const hasFiles = files.some(f => f !== null);

        if (!hasFiles) {
            alert("Subí al menos una imagen de tela.");
            return;
        }

        setLoading(true);
        setResultado(null);
        setTiempoTranscurrido(0);

        const prompt = `Genera un o una ${tipo} hecha con el tipo de telas que se describe. Fondo blanco, estilo realista.`;

        // Contador de tiempo
        const intervalo = setInterval(() => {
            setTiempoTranscurrido((prev) => prev + 1);
        }, 1000);

        try {
            // Preparar FormData para enviar archivos
            const formData = new FormData();
            formData.append("prompt", prompt);

            files.forEach((file, index) => {
                if (file) {
                    formData.append("images", file);
                }
            });

            const body = formData;

            // Aumentar timeout para la generación (puede tardar 2-3 minutos)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos

            let res;
            try {
                res = await fetch("/api/generar", {
                    method: "POST",
                    body: body,
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!res.ok) {
                // Intentar leer como JSON si hay error
                try {
                    const errorData = await res.json();
                    console.error("Error del servidor:", errorData);
                    alert(`Error: ${errorData.error || `Error ${res.status}`}`);
                } catch {
                    alert(`Error ${res.status}: ${res.statusText}`);
                }
                clearInterval(intervalo);
                setLoading(false);
                setTiempoTranscurrido(0);
                return;
            }

            // Verificar si la respuesta es una imagen
            const contentType = res.headers.get("content-type");
            console.log("Content-Type recibido:", contentType);

            if (contentType && contentType.startsWith("image/")) {
                // La respuesta es una imagen directa
                console.log("Procesando imagen...");
                try {
                    const blob = await res.blob();
                    console.log("Blob creado, tamaño:", blob.size, "bytes");
                    const imageUrl = URL.createObjectURL(blob);
                    console.log("URL de objeto creada:", imageUrl);
                    setResultado(imageUrl);
                    console.log("Imagen establecida en el estado");
                } catch (blobError) {
                    console.error("Error al procesar blob:", blobError);
                    alert(`Error al procesar la imagen: ${blobError.message}`);
                }
            } else {
                // Intentar leer como JSON (para compatibilidad con otras APIs)
                try {
                    const data = await res.json();
                    console.log("Respuesta JSON recibida:", data);
                    if (data.image_url) {
                        setResultado(data.image_url);
                    } else {
                        console.error("Respuesta inesperada:", data);
                        alert(`No se generó ninguna imagen. Respuesta recibida: ${JSON.stringify(data)}`);
                    }
                } catch (jsonError) {
                    console.error("Error al parsear JSON:", jsonError);
                    alert(`Error al procesar la respuesta: ${jsonError.message}`);
                }
            }
        } catch (err) {
            console.error("Error al generar:", err);
            if (err.name === "AbortError" || err.message?.includes("timeout")) {
                alert("La generación está tardando demasiado. Por favor, intenta nuevamente.");
            } else {
                alert(`Error al generar imagen: ${err.message}`);
            }
        } finally {
            clearInterval(intervalo);
            setLoading(false);
            setTiempoTranscurrido(0);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-block">
                        <span className="text-5xl">🧵</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                        Generador de Ropa con Telas
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Sube imágenes de telas (hasta 3) y genera prendas personalizadas con IA
                    </p>
                </div>

                {/* File Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300"
                        >
                            <label className="block cursor-pointer">
                                <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 transition-colors duration-300 bg-gray-50/50">
                                    {previews[i] ? (
                                        <div className="relative w-full h-full">
                                            <img
                                                src={previews[i]}
                                                alt={`Preview ${i + 1}`}
                                                className="w-full h-48 object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleFileChange(i, null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                                title="Eliminar imagen"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="text-4xl mb-3">📷</div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                Tela {i + 1}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Click para subir
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(i, e.target.files[0] || null)}
                                    />
                                </div>
                            </label>
                        </div>
                    ))}
                </div>

                {/* Generate Buttons */}
                <div className="flex flex-wrap gap-4 justify-center mb-8">
                    <button
                        onClick={() => generar("remera")}
                        disabled={loading}
                        className="group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            👕 Remera
                        </span>
                    </button>
                    <button
                        onClick={() => generar("pantalón")}
                        disabled={loading}
                        className="group relative bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            👖 Pantalón
                        </span>
                    </button>
                    <button
                        onClick={() => generar("buzo")}
                        disabled={loading}
                        className="group relative bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            🧥 Buzo
                        </span>
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 max-w-2xl mx-auto">
                        <div className="text-center space-y-6">
                            <div className="inline-block animate-spin text-5xl">⏳</div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 mb-2">
                                    Generando imagen...
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    Esto puede tardar 30-60 segundos
                                </p>
                                {tiempoTranscurrido > 0 && (
                                    <p className="text-sm font-medium text-purple-600 mb-4">
                                        Tiempo transcurrido: {tiempoTranscurrido}s
                                    </p>
                                )}
                            </div>
                            <div className="w-full max-w-md mx-auto">
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300 relative"
                                        style={{
                                            width: `${Math.min((tiempoTranscurrido / 60) * 100, 95)}%`,
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <style jsx>{`
                            @keyframes shimmer {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(100%); }
                            }
                            .animate-shimmer {
                                animation: shimmer 1.5s infinite;
                            }
                        `}</style>
                    </div>
                )}

                {/* Result */}
                {resultado && !loading && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                            ✨ Imagen Generada
                        </h2>
                        <div className="flex justify-center">
                            <img
                                src={resultado}
                                alt="Imagen generada"
                                className="w-full max-w-lg rounded-xl shadow-lg object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
