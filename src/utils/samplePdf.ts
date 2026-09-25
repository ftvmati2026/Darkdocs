/**
 * Generates a valid multi-page PDF ArrayBuffer in PDF 1.4 format
 * containing technical paper content (matching DarkPDF aesthetics)
 * for immediate testing and demonstration.
 */
export function generateSamplePdfArrayBuffer(): ArrayBuffer {
  // Minimal valid PDF with 3 pages of rich technical content
  const pdfString = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 7 0 R 11 0 R]
  /Count 3
>>
endobj

3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj

4 0 obj
<<
  /Length 1250
>>
stream
0.2 0.2 0.25 rg
20 810 555 1.5 re f
0.85 0.55 0.1 rg
20 820 6 6 re f
BT
/F2 8 Tf
20 0.5 0.1 rg
32 821 Td
(ARQUITECTURA DE SISTEMAS DISTRIBUIDOS // PROTOCOLOS DE CONSENSO) Tj
ET
BT
/F1 8 Tf
0.4 0.4 0.45 rg
420 821 Td
(DOC-ID: BFT-2025-v4.2  |  Rev. 2025) Tj
ET

0.1 0.6 0.7 rg
20 770 180 18 re f
BT
/F2 8 Tf
1 1 1 rg
26 775 Td
(PUBLICACION TECNICA ESPECIALIZADA) Tj
ET

BT
/F2 18 Tf
0.1 0.1 0.15 rg
20 735 Td
(Capitulo 1: Tolerancia a Fallos Bizantinos y Estado Replicado) Tj
ET

BT
/F1 10 Tf
0.3 0.3 0.35 rg
20 710 Td
(Dr. Adrian Morales  *  Depto. de Ciencias de la Computacion  *  adrian.morales@lab-distribuido.org) Tj
ET

0.95 0.95 0.97 rg
20 610 555 80 re f
0.85 0.55 0.1 rg
20 610 3 80 re f

BT
/F2 10 Tf
0.85 0.55 0.1 rg
30 672 Td
(RESUMEN EJECUTIVO) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
30 652 Td
(Examinamos el problema clasico del consenso sobre canales de comunicacion asincronos en presencia de) Tj
0 -14 Td
(hasta f nodos maliciosos o con fallas bizantinas arbitrarias. Demostramos la cota minima de 3f + 1 replicas) Tj
0 -14 Td
(con quorums adaptativos, garantizando consistencia inmutable con latencia ultra-baja.) Tj
ET

BT
/F2 13 Tf
0.85 0.55 0.1 rg
20 575 Td
(1.1 Fundamentos y Topologia de Red) Tj
ET

BT
/F1 9 Tf
0.15 0.15 0.15 rg
20 555 Td
(En un sistema donde no existen suposiciones de confianza mutua absoluta, el problema fundamental) Tj
0 -13 Td
(consiste en concordar univocamente sobre la siguiente mutacion de estado valida. Si denominamos S_k) Tj
0 -13 Td
(al estado actual de la maquina de estados y T a la transaccion entrante, la funcion de transicion de estado) Tj
0 -13 Td
(f(S_k, T) -> S_{k+1} debe ejecutarse de forma replicada e identica en todos los participantes honestos.) Tj
0 -13 Td
(Los nodos adversarios no solo pueden emitir silencios o retardar deliberadamente los paquetes TCP,) Tj
0 -13 Td
(sino enviar informacion diametralmente contradictoria a distintas particiones topologicas.) Tj
ET

BT
/F2 13 Tf
0.85 0.55 0.1 rg
20 445 Td
(1.2 Requisitos del Quorum de dos Fases) Tj
ET

BT
/F1 9 Tf
0.15 0.15 0.15 rg
20 425 Td
(Para neutralizar las firmas falsificadas y la colusion clandestina, el protocolo exige una fase preliminar) Tj
0 -13 Td
(de Pre-Prepare seguida de una barrera sincronizada de Prepare y posterior Commit.) Tj
ET

0.93 0.94 0.96 rg
20 370 260 26 re f
BT
/F2 10 Tf
0.1 0.5 0.6 rg
30 380 Td
(|Q| >= 2f + 1  ===  ceil((2N + 1) / 3)) Tj
ET

BT
/F1 9 Tf
0.15 0.15 0.15 rg
20 345 Td
(Solo cuando un nodo acumula un certificado de validacion compuesto por el quorum anterior,) Tj
0 -13 Td
(es admisible registrar la confirmacion definitiva en el ledger criptografico persistente.) Tj
ET

0.95 0.95 0.95 rg
20 180 555 135 re f
0.8 0.8 0.85 RG
1 w
20 180 555 135 re S

BT
/F2 10 Tf
0.2 0.2 0.2 rg
35 295 Td
(Figura 1.1: Flujo de Propagacion de Transacciones y Verificacion de Quorum) Tj
ET

0.85 0.9 0.95 rg
40 215 90 50 re f
0.1 0.5 0.7 RG
40 215 90 50 re S
BT
/F2 8 Tf
0.1 0.4 0.6 rg
50 245 Td
(CLIENTE / TX) Tj
0 -11 Td
(Nodo Emisor) Tj
ET

0.98 0.95 0.9 rg
180 215 100 50 re f
0.85 0.55 0.1 RG
180 215 100 50 re S
BT
/F2 8 Tf
0.7 0.4 0.05 rg
190 245 Td
(LIDER PRIMARIO) Tj
0 -11 Td
(Secuenciador) Tj
ET

0.9 0.96 0.93 rg
330 215 110 50 re f
0.2 0.6 0.4 RG
330 215 110 50 re S
BT
/F2 8 Tf
0.1 0.5 0.3 rg
340 245 Td
(QUORUM 2f + 1) Tj
0 -11 Td
(80% APROBADO) Tj
ET

0.92 0.97 0.94 rg
480 215 80 50 re f
0.1 0.6 0.3 RG
480 215 80 50 re S
BT
/F2 8 Tf
0.1 0.5 0.2 rg
490 245 Td
(COMMIT LOG) Tj
0 -11 Td
(Inmutable) Tj
ET

0.5 0.5 0.5 RG
2 w
130 240 m 180 240 l S
280 240 m 330 240 l S
440 240 m 480 240 l S

BT
/F1 8 Tf
0.4 0.4 0.4 rg
120 195 Td
(Esquema de comunicacion con triple barrera criptografica y tolerancia a particiones de red.) Tj
ET

BT
/F2 12 Tf
0.85 0.55 0.1 rg
20 145 Td
(1.3 Consideraciones de Lectura y Fatiga Ocular) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
20 125 Td
(Bajo esquemas analiticos de visualizacion continua, los operadores que validan transacciones durante periodos) Tj
0 -13 Td
(prolongados en estaciones criticas requieren interfaces disenadas meticulosamente para minimizar la fatiga visual.) Tj
0 -13 Td
(DarkPDF proporciona un algoritmo de inversion de colores de alto contraste que preserva la atencion.) Tj
ET

0.85 0.85 0.85 rg
20 60 555 1 re f
BT
/F1 8 Tf
0.4 0.4 0.4 rg
20 45 Td
(1. Lamport, L., Shostak, R., Pease, M. "The Byzantine Generals Problem" ACM TOPLAS (1982)) Tj
ET
BT
/F2 8 Tf
0.85 0.55 0.1 rg
530 45 Td
(Pag. 1 / 3) Tj
ET
endstream
endobj

5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj

6 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj

7 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Contents 8 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj

8 0 obj
<<
  /Length 950
>>
stream
0.2 0.2 0.25 rg
20 810 555 1.5 re f
BT
/F2 8 Tf
0.85 0.55 0.1 rg
20 821 Td
(ARQUITECTURA DE SISTEMAS DISTRIBUIDOS // PROTOCOLOS DE CONSENSO) Tj
ET
BT
/F1 8 Tf
0.4 0.4 0.45 rg
420 821 Td
(DOC-ID: BFT-2025-v4.2  |  Rev. 2025) Tj
ET

BT
/F2 16 Tf
0.1 0.1 0.15 rg
20 760 Td
(Capitulo 2: Mecanismos de Sincronizacion y Timestamps Logicos) Tj
ET

BT
/F1 10 Tf
0.3 0.3 0.35 rg
20 735 Td
(Analisis formal de vectores de Lamport y relojes vectoriales en entornos asincronos.) Tj
ET

BT
/F2 13 Tf
0.85 0.55 0.1 rg
20 690 Td
(2.1 Relacion de Causalidad Estricta) Tj
ET

BT
/F1 9.5 Tf
0.15 0.15 0.15 rg
20 668 Td
(En ausencia de un reloj fisico unificado y confiable, la nocion de precedencia temporal entre eventos) Tj
0 -14 Td
(se define mediante el orden parcial "sucede-antes" (happens-before, denotado por ->).) Tj
0 -14 Td
(Para dos eventos cualesquiera a y b pertenecientes a un mismo hilo de ejecucion, a -> b si el instante local) Tj
0 -14 Td
(de a precede al de b. Asimismo, el envio de un mensaje siempre precede estrictamente a su recepcion.) Tj
ET

0.94 0.94 0.97 rg
20 540 555 55 re f
0.1 0.5 0.7 rg
20 540 4 55 re f
BT
/F2 10 Tf
0.1 0.4 0.6 rg
32 575 Td
(Teorema de Orden Parcial Causal:) Tj
ET
BT
/F1 9 Tf
0.2 0.2 0.25 rg
32 555 Td
(Si e_1 -> e_2 entonces V(e_1) < V(e_2). La implicacion inversa requiere vectores completos de dimension N.) Tj
ET

BT
/F2 13 Tf
0.85 0.55 0.1 rg
20 500 Td
(2.2 Resiliencia ante Desconexiones Intermitentes) Tj
ET

BT
/F1 9.5 Tf
0.15 0.15 0.15 rg
20 478 Td
(Cuando ocurren particiones en la red fisica, los subconjuntos aislados de nodos deben aplicar politicas) Tj
0 -14 Td
(deterministas para evitar estados divergentes irreversibles (split-brain). El uso de firmas criptograficas) Tj
0 -14 Td
(combinadas con funciones hash BLAKE3 permite verificar la integridad sin incurrir en penalizaciones) Tj
0 -14 Td
(de computo excesivas en procesadores de proposito general.) Tj
ET

0.85 0.85 0.85 rg
20 60 555 1 re f
BT
/F1 8 Tf
0.4 0.4 0.4 rg
20 45 Td
(DarkPDF - Lector de Alto Rendimiento para Documentos Cientificos) Tj
ET
BT
/F2 8 Tf
0.85 0.55 0.1 rg
530 45 Td
(Pag. 2 / 3) Tj
ET
endstream
endobj

11 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Contents 12 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
    >>
  >>
>>
endobj

12 0 obj
<<
  /Length 850
>>
stream
0.2 0.2 0.25 rg
20 810 555 1.5 re f
BT
/F2 8 Tf
0.85 0.55 0.1 rg
20 821 Td
(ARQUITECTURA DE SISTEMAS DISTRIBUIDOS // PROTOCOLOS DE CONSENSO) Tj
ET
BT
/F1 8 Tf
0.4 0.4 0.45 rg
420 821 Td
(DOC-ID: BFT-2025-v4.2  |  Rev. 2025) Tj
ET

BT
/F2 16 Tf
0.1 0.1 0.15 rg
20 760 Td
(Capitulo 3: Evaluacion Experimental y Conclusiones) Tj
ET

BT
/F1 9.5 Tf
0.15 0.15 0.15 rg
20 725 Td
(Se evaluo el rendimiento del algoritmo con grupos de prueba que van desde 4 hasta 64 nodos activos en) Tj
0 -14 Td
(diferentes centros de datos con latencias simuladas de 15ms a 120ms.) Tj
ET

BT
/F2 11 Tf
0.85 0.55 0.1 rg
20 660 Td
(Tabla 3.1: Metricas Comparativas de Rendimiento por Tamano de Cluster) Tj
ET

0.92 0.92 0.94 rg
20 540 555 100 re f
0.8 0.8 0.85 RG
1 w
20 540 555 100 re S

BT
/F2 9 Tf
0.1 0.1 0.1 rg
30 620 Td
(Nodos (N)) Tj
100 0 Td
(Tolerancia (f)) Tj
110 0 Td
(RPS (Tx/seg)) Tj
110 0 Td
(Latencia p99 (ms)) Tj
110 0 Td
(Consenso) Tj
ET

0.8 0.8 0.85 RG
20 610 m 575 610 l S

BT
/F1 9 Tf
0.2 0.2 0.2 rg
30 590 Td
(4 nodos) Tj
100 0 Td
(1 fallo) Tj
110 0 Td
(24,500) Tj
110 0 Td
(14.2 ms) Tj
110 0 Td
(100% Determinista) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
30 565 Td
(16 nodos) Tj
100 0 Td
(5 fallos) Tj
110 0 Td
(19,800) Tj
110 0 Td
(28.6 ms) Tj
110 0 Td
(100% Determinista) Tj
ET

BT
/F2 13 Tf
0.85 0.55 0.1 rg
20 500 Td
(3.2 Conclusiones Principales) Tj
ET

BT
/F1 9.5 Tf
0.15 0.15 0.15 rg
20 478 Td
(1. La eliminacion de rondas sincronicas permite triplicar el throughput frente a protocolos clasicos.) Tj
0 -15 Td
(2. El filtrado de quorums dinamicos resiste particiones agresivas sin comprometer la consistencia.) Tj
0 -15 Td
(3. La lectura en modo invertido asistida por DarkPDF facilita la auditoria de trazas de ejecucion complejas.) Tj
ET

0.85 0.85 0.85 rg
20 60 555 1 re f
BT
/F1 8 Tf
0.4 0.4 0.4 rg
20 45 Td
(Fin del Documento Tecnico - DarkPDF Engine) Tj
ET
BT
/F2 8 Tf
0.85 0.55 0.1 rg
530 45 Td
(Pag. 3 / 3) Tj
ET
endstream
endobj

xref
0 13
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000147 00000 n 
0000000295 00000 n 
0000001600 00000 n 
0000001677 00000 n 
0000001759 00000 n 
0000001907 00000 n 
0000002912 00000 n 
0000002989 00000 n 
0000003071 00000 n 
0000003220 00000 n 
trailer
<<
  /Size 13
  /Root 1 0 R
>>
startxref
4125
%%EOF
`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfString).buffer;
}
