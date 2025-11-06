import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// Configurar timeout extendido para esta ruta
export const maxDuration = 300; // 5 minutos (máximo permitido en Vercel)

export async function POST(req) {
    try {
        // Verificar si es FormData (archivos) o JSON (URLs)
        const contentType = req.headers.get("content-type") || "";
        let prompt, imageBuffer, base64Image, mimeType;

        if (contentType.includes("multipart/form-data")) {
            // Manejar archivos subidos
            const formData = await req.formData();
            prompt = formData.get("prompt");
            const files = formData.getAll("images");

            if (!prompt) {
                return NextResponse.json(
                    { error: "El prompt es requerido" },
                    { status: 400 }
                );
            }

            if (!files || files.length === 0) {
                return NextResponse.json(
                    { error: "Se requiere al menos una imagen" },
                    { status: 400 }
                );
            }

            // Procesar el primer archivo
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            base64Image = imageBuffer.toString("base64");
            mimeType = file.type || "image/jpeg";

            console.log("Analizando imagen de tela subida con Gemini...");
        } else {
            // Manejar URLs (JSON)
            const { prompt: promptJson, images } = await req.json();

            // Validaciones
            if (!promptJson) {
                return NextResponse.json(
                    { error: "El prompt es requerido" },
                    { status: 400 }
                );
            }

            if (!images || !Array.isArray(images) || images.length === 0) {
                return NextResponse.json(
                    { error: "Se requiere al menos una imagen (URL)" },
                    { status: 400 }
                );
            }

            prompt = promptJson;
            const inputImage = images[0];

            console.log("Analizando imagen de tela desde URL con Gemini...");
            console.log("Imagen de referencia:", inputImage);

            // Descargar la imagen desde URL
            const imageResponse = await fetch(inputImage);
            if (!imageResponse.ok) {
                throw new Error("No se pudo descargar la imagen de referencia");
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            base64Image = imageBuffer.toString("base64");
            mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
        }

        // Paso 1: Analizar la imagen de tela con Gemini Vision para extraer detalles MUY específicos
        let telaDescription = "";

        if (process.env.GOOGLE_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                // Prompt mejorado para análisis MUY detallado de la tela
                const analysisPrompt = `Analiza esta imagen de tela/textil con EXTREMO DETALLE. Eres un experto en textiles y necesitas describir EXACTAMENTE esta tela para que pueda ser replicada fielmente.

ANÁLISIS REQUERIDO (responde en español, punto por punto):

COLORES:
- Colores principales exactos (nombres específicos: azul marino, rojo carmesí, verde esmeralda, etc.)
- Colores secundarios o de acento
- Distribución de los colores (proporciones, ubicación)
- Matices o tonos específicos
- ¿Es un color sólido o tiene variaciones?

PATRÓN/DISEÑO:
- Tipo de patrón exacto (floral, geométrico, abstracto, rayas, puntos, cuadros, etc.)
- Tamaño del patrón (pequeño, mediano, grande)
- Distribución del patrón (repetitivo, irregular, simétrico, etc.)
- Detalles del patrón (si es floral: tipo de flores, cantidad, disposición)
- Si hay rayas: dirección (horizontales, verticales, diagonales), grosor, espaciado
- Si hay puntos: tamaño, densidad, distribución

TEXTURA:
- Tipo de textura visible (lisa, rugosa, con relieve, satinada, mate, etc.)
- Estructura del tejido (tela, punto, etc.)
- Grosor aparente (delgada, media, gruesa)
- Brillo o acabado (brillante, mate, satinado)
- Superficie (plana, con textura 3D, etc.)

MATERIAL:
- Material aparente (algodón, seda, lino, poliéster, lana, etc.)
- Acabado del material (algodón crudo, seda satinada, etc.)

DETALLES ESPECÍFICOS:
- Cualquier detalle único o distintivo
- Repetición del patrón (si aplica)
- Bordes o terminaciones visibles
- Efectos especiales (estampado, bordado, etc.)

IMPORTANTE: Responde de forma estructurada y MUY específica. Cada detalle cuenta para replicar esta tela exactamente.`;

                console.log("Analizando imagen de tela con Gemini (análisis detallado)...");

                const result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    analysisPrompt,
                ]);

                telaDescription = result.response.text();
                console.log("Descripción detallada de la tela:", telaDescription);

                // Opcional: hacer un segundo análisis para mejorar la descripción
                if (telaDescription.length < 200) {
                    console.log("Descripción muy corta, haciendo análisis complementario...");
                    const complementPrompt = `Basándote en la descripción anterior: "${telaDescription}", 
                    proporciona detalles adicionales ESPECÍFICOS sobre:
                    - Colores exactos con sus nombres técnicos (ej: "azul cobalto" no "azul")
                    - Descripción precisa del patrón con medidas aproximadas
                    - Detalles de textura y material que sean identificables visualmente
                    
                    Responde en español, siendo MUY específico y técnico.`;

                    try {
                        const complementResult = await model.generateContent([
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: mimeType,
                                },
                            },
                            complementPrompt,
                        ]);

                        const complementDescription = complementResult.response.text();
                        telaDescription = `${telaDescription}\n\nDetalles complementarios: ${complementDescription}`;
                        console.log("Descripción mejorada con complementos");
                    } catch (complementError) {
                        console.warn("Error en análisis complementario, usando descripción inicial");
                    }
                }

            } catch (geminiError) {
                console.warn("Error al analizar con Gemini, usando prompt básico:", geminiError.message);
                telaDescription = "colores, textura y patrones de la tela de la imagen de referencia";
            }
        } else {
            console.warn("GOOGLE_API_KEY no configurada, usando prompt básico");
            telaDescription = "colores, textura y patrones de la tela de la imagen de referencia";
        }

        // Paso 2: Generar imagen con deAPI (Text-to-Image)
        if (!process.env.DEAPI_API_KEY) {
            return NextResponse.json(
                { error: "DEAPI_API_KEY es requerida. Obtén tu API key en https://deapi.ai/ y agrega DEAPI_API_KEY a tu .env.local" },
                { status: 500 }
            );
        }

        console.log("Generando imagen con deAPI...");
        console.log("Prompt original:", prompt);

        // Mejorar el prompt con la descripción detallada de la tela analizada por Gemini
        // Formato optimizado para que la IA genere la tela exactamente como se describe
        let enhancedPrompt;

        if (telaDescription && telaDescription.length > 50) {
            // Si tenemos una descripción detallada de Gemini, usarla de forma estructurada
            enhancedPrompt = `${prompt}

ESPECIFICACIONES EXACTAS DE LA TELA A USAR:
${telaDescription}

REQUISITOS CRÍTICOS:
- La prenda DEBE usar EXACTAMENTE esta tela con todos sus detalles: colores, patrones, textura y material específicos mencionados arriba
- Los colores deben ser idénticos a los descritos
- El patrón debe replicarse exactamente como se describe
- La textura visible debe coincidir con la descripción
- El material debe verse como el especificado

ESTILO DE FOTOGRAFÍA:
- Fotografía profesional de moda de alta calidad
- Fondo blanco limpio
- Iluminación de estudio profesional que muestre todos los detalles de la tela
- Primer plano que permita ver claramente la textura y el patrón
- La tela debe ser el elemento principal y visible en toda la prenda`;
        } else {
            // Si no hay descripción detallada, usar prompt mejorado básico
            enhancedPrompt = `${prompt}. La prenda debe usar los colores, texturas y patrones EXACTOS de la tela de la imagen de referencia proporcionada. La tela debe ser visible claramente en toda la prenda con todos sus detalles. Alta calidad, fotografías realistas de moda profesional, fondo blanco, iluminación de estudio, detalles nítidos de la textura y patrón de la tela perfectamente visibles.`;
        }

        try {
            // Llamar a la API de deAPI para generar imagen
            const deapiUrl = "https://api.deapi.ai/api/v1/client/txt2img";

            const requestBody = {
                prompt: enhancedPrompt,
                negative_prompt: "blur, darkness, noise, low quality, distorted, deformed, wrong colors, wrong pattern, different fabric, incorrect texture, wrong material",
                model: "Flux1schnell", // Modelo correcto según documentación
                width: 1024,
                height: 1024,
                guidance: 9.0, // Aumentado para que siga mejor el prompt
                steps: 10, // Máximo permitido por deAPI
                seed: Math.floor(Math.random() * 1000000), // Seed aleatorio
            };

            console.log("Llamando a deAPI...");
            console.log("URL:", deapiUrl);
            console.log("Body:", JSON.stringify(requestBody));

            const response = await fetch(deapiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.DEAPI_API_KEY}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error de deAPI:", errorText);
                console.error("Status:", response.status);

                let errorMessage = `Error ${response.status}: ${response.statusText}`;

                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error?.message || errorJson.message || errorJson.detail || errorMessage;
                } catch {
                    // Si no se puede parsear, usar el texto original
                    if (errorText) {
                        errorMessage = errorText.substring(0, 200);
                    }
                }

                return NextResponse.json(
                    { error: `Error al generar imagen con deAPI: ${errorMessage}` },
                    { status: response.status }
                );
            }

            const responseData = await response.json();
            console.log("Respuesta inicial de deAPI:", JSON.stringify(responseData, null, 2));

            // deAPI devuelve un request_id, necesitamos consultar el resultado
            if (!responseData.data || !responseData.data.request_id) {
                return NextResponse.json(
                    { error: "No se recibió un request_id válido de deAPI" },
                    { status: 500 }
                );
            }

            const requestId = responseData.data.request_id;
            console.log("Request ID recibido:", requestId);

            // Paso 2: Consultar el resultado usando el request_id (polling)
            // Endpoint según documentación: GET /api/v1/client/request-status/{job_request}
            const statusUrl = `https://api.deapi.ai/api/v1/client/request-status/${requestId}`;

            const maxAttempts = 60; // Máximo 60 intentos (2 minutos)
            let attempts = 0;
            let imageUrl = null;

            while (attempts < maxAttempts && !imageUrl) {
                // Esperar 2 segundos entre consultas
                if (attempts > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                try {
                    console.log(`Consultando estado (intento ${attempts + 1}): ${statusUrl}`);

                    const statusResponse = await fetch(statusUrl, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${process.env.DEAPI_API_KEY}`,
                            "Accept": "application/json",
                        },
                    });

                    if (!statusResponse.ok) {
                        if (statusResponse.status === 404) {
                            // Si aún no existe, continuar esperando
                            console.log("Estado: aún no disponible (404)");
                            attempts++;
                            continue;
                        }

                        const errorText = await statusResponse.text();
                        console.error("Error consultando estado:", errorText);
                        attempts++;
                        continue;
                    }

                    const statusData = await statusResponse.json();
                    console.log("Estado recibido:", JSON.stringify(statusData, null, 2));

                    // Según la documentación, la respuesta tiene esta estructura:
                    // {
                    //   "data": {
                    //     "status": "pending" | "completed" | "failed",
                    //     "preview": "url",
                    //     "result_url": "url",
                    //     "result": "url",
                    //     "progress": 45.5
                    //   }
                    // }

                    if (statusData.data) {
                        const status = statusData.data.status;
                        const progress = statusData.data.progress;

                        console.log(`Estado: ${status}, Progreso: ${progress}%`);

                        // Verificar si hay error
                        if (status === "failed" || status === "error") {
                            return NextResponse.json(
                                { error: statusData.data.error || statusData.data.message || "La generación falló" },
                                { status: 500 }
                            );
                        }

                        // Si está completado, obtener la URL de la imagen
                        if (status === "completed" || status === "done" || statusData.data.result_url || statusData.data.result) {
                            // Buscar la URL de la imagen resultante
                            const imageUrl = statusData.data.result_url || statusData.data.result || statusData.data.preview;

                            if (imageUrl) {
                                console.log("Imagen generada exitosamente, URL:", imageUrl);

                                // Devolver la URL directamente en lugar de descargar la imagen
                                return NextResponse.json({
                                    image_url: imageUrl,
                                });
                            } else {
                                console.log("Estado completado pero no hay URL de imagen disponible aún");
                            }
                        }
                        // Si está pendiente, continuar esperando
                    }

                } catch (err) {
                    console.error(`Error en consulta (intento ${attempts + 1}):`, err.message);
                    attempts++;
                    continue;
                }

                attempts++;
            }

            if (!imageUrl) {
                return NextResponse.json(
                    { error: "Tiempo de espera agotado. La generación está tomando más tiempo del esperado." },
                    { status: 504 }
                );
            }

            // Esto no debería ejecutarse porque ya retornamos dentro del while,
            // pero por si acaso dejamos un fallback
            return NextResponse.json({
                image_url: imageUrl,
            });
        } catch (deapiError) {
            console.error("Error al generar imagen con deAPI:", deapiError);
            return NextResponse.json(
                {
                    error: `Error al generar imagen: ${deapiError.message || "Error desconocido"}`,
                    details: process.env.NODE_ENV === "development" ? deapiError.stack : undefined
                },
                { status: 500 }
            );
        }
    } catch (err) {
        console.error("Error en /api/generar:", err);
        console.error("Stack:", err.stack);

        return NextResponse.json(
            {
                error: err.message || "Error desconocido al procesar la solicitud",
                details: process.env.NODE_ENV === "development" ? err.stack : undefined
            },
            { status: 500 }
        );
    }
}
