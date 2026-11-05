// Compressão de fotos no navegador, antes do envio (RNF04).
// Usada no formulário de publicar e no "Encontrei o animal".

export const TAMANHO_MAXIMO_FOTO = 1024 * 1024; // 1 MB depois de comprimida
export const TIPOS_FOTO = ["image/webp", "image/jpeg", "image/png"];

// Reduz a foto para no máximo 1280 px e converte para WebP.
export async function comprimirFoto(arquivo) {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const qualidade of [0.82, 0.7, 0.55]) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", qualidade));
    if (blob && blob.size <= TAMANHO_MAXIMO_FOTO) return new File([blob], "foto.webp", { type: blob.type });
  }
  throw new Error("Não foi possível reduzir esta foto para menos de 1 MB.");
}
