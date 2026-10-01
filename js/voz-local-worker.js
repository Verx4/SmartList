import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";

const MODELO_VOZ = "onnx-community/whisper-tiny";
let transcritorPromise = null;
let ultimoProgresso = -1;

env.allowLocalModels = false;
env.useBrowserCache = true;

function informarProgresso(progresso) {
    if (progresso?.status === "progress" && Number.isFinite(progresso.progress)) {
        const percentual = Math.round(progresso.progress);
        if (percentual === ultimoProgresso || percentual % 5 !== 0) return;
        ultimoProgresso = percentual;
        self.postMessage({
            tipo: "progresso",
            mensagem: `Preparando reconhecimento de voz… ${percentual}%`
        });
        return;
    }
    if (["initiate", "download"].includes(progresso?.status)) {
        self.postMessage({
            tipo: "progresso",
            mensagem: "Primeiro uso: baixando o reconhecimento de voz gratuito…"
        });
    }
}

function obterTranscritor() {
    if (!transcritorPromise) {
        ultimoProgresso = -1;
        transcritorPromise = pipeline("automatic-speech-recognition", MODELO_VOZ, {
            device: "wasm",
            dtype: "q4",
            progress_callback: informarProgresso
        });
    }
    return transcritorPromise;
}

self.addEventListener("message", async evento => {
    const { tipo, id, audio } = evento.data || {};
    if (tipo !== "transcrever" || !audio) return;

    try {
        self.postMessage({
            tipo: "progresso",
            mensagem: transcritorPromise
                ? "Reconhecendo os produtos no aparelho…"
                : "Carregando reconhecimento de voz gratuito…"
        });
        const transcritor = await obterTranscritor();
        const resultado = await transcritor(audio, {
            language: "portuguese",
            task: "transcribe",
            chunk_length_s: 25,
            stride_length_s: 4
        });
        const texto = String(resultado?.text || "").trim();
        if (!texto) throw new Error("Não consegui ouvir produtos. Fale mais perto do microfone.");
        self.postMessage({ tipo: "resultado", id, texto });
    } catch (erro) {
        transcritorPromise = null;
        self.postMessage({
            tipo: "erro",
            id,
            mensagem: navigator.onLine
                ? "Não foi possível reconhecer a voz neste aparelho. Tente uma fala mais curta."
                : "Conecte-se à internet no primeiro uso para baixar o reconhecimento de voz."
        });
    }
});
