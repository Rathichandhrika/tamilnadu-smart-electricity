import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Image as ImageIcon, 
    ExternalLink, 
    Download, 
    RefreshCw, 
    ZoomIn, 
    ZoomOut, 
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    Trash2
} from 'lucide-react';

export default function KycDocumentViewer({ 
    docUrl, 
    fileName = 'Document', 
    isPdf = false, 
    language = 'en',
    onDelete = null,
    isDeleting = false
}) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        let isMounted = true;
        let createdUrl = null;

        const loadDocument = async () => {
            if (!docUrl || docUrl === '#') {
                setLoading(false);
                setError('Invalid document address');
                return;
            }

            setLoading(true);
            setError(null);
            setZoom(1);

            try {
                // Fetch document as a blob to bypass browser cross-origin plugin restrictions
                const response = await fetch(docUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();
                if (!isMounted) return;

                const mimeType = isPdf 
                    ? 'application/pdf' 
                    : (blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg');

                const safeBlob = new Blob([blob], { type: mimeType });
                createdUrl = URL.createObjectURL(safeBlob);
                setBlobUrl(createdUrl);
            } catch (err) {
                console.warn('Direct blob load failed, using direct URL fallback:', err);
                if (isMounted) {
                    // Fall back to direct link so native browser can attempt rendering
                    setBlobUrl(docUrl);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDocument();

        return () => {
            isMounted = false;
            if (createdUrl && createdUrl.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(createdUrl);
                } catch (_) {}
            }
        };
    }, [docUrl, isPdf]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = blobUrl || docUrl;
        link.download = fileName || (isPdf ? 'document.pdf' : 'document.jpg');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenExternal = () => {
        window.open(docUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="rounded-xl border border-panelBorder bg-darker overflow-hidden shadow-inner flex flex-col">
            {/* Header Control Bar */}
            <div className="p-2.5 bg-dark border-b border-panelBorder flex flex-wrap justify-between items-center gap-2 text-xs">
                <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-md">
                    {isPdf ? (
                        <FileText size={15} className="text-gold-400 shrink-0" />
                    ) : (
                        <ImageIcon size={15} className="text-gold-400 shrink-0" />
                    )}
                    <span className="font-mono text-slate-200 truncate font-semibold" title={fileName}>
                        {fileName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel border border-panelBorder text-gold-400 shrink-0">
                        {isPdf ? 'PDF' : 'IMAGE'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Image Zoom Controls */}
                    {!isPdf && (
                        <div className="flex items-center bg-darker rounded-lg border border-panelBorder p-0.5 mr-1">
                            <button
                                type="button"
                                onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Zoom Out"
                            >
                                <ZoomOut size={13} />
                            </button>
                            <span className="text-[10px] font-mono px-1.5 text-slate-300">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Zoom In"
                            >
                                <ZoomIn size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(1)}
                                className="p-1 text-slate-400 hover:text-gold-400 transition"
                                title="Reset Zoom"
                            >
                                <RotateCcw size={12} />
                            </button>
                        </div>
                    )}

                    {/* Download */}
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="px-2.5 py-1 rounded-lg bg-panel hover:bg-dark border border-panelBorder text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold"
                        title={language === 'ta' ? 'பதிவிறக்கம் செய்' : 'Download Document'}
                    >
                        <Download size={12} />
                        <span className="hidden sm:inline">{language === 'ta' ? 'பதிவிறக்கு' : 'Download'}</span>
                    </button>

                    {/* Open in New Window */}
                    <button
                        type="button"
                        onClick={handleOpenExternal}
                        className="px-2.5 py-1 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:text-gold-300 transition flex items-center gap-1 text-[11px] font-bold"
                        title={language === 'ta' ? 'புதிய சாளரத்தில் திற' : 'Open in New Tab'}
                    >
                        <span>{language === 'ta' ? 'புதிய சாளரம்' : 'Open Tab'}</span>
                        <ExternalLink size={12} />
                    </button>

                    {/* Delete button if provided */}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition flex items-center gap-1 text-[11px] font-semibold"
                            title={language === 'ta' ? 'ஆவணத்தை நீக்கு' : 'Delete Document'}
                        >
                            {isDeleting ? (
                                <RefreshCw size={12} className="animate-spin" />
                            ) : (
                                <Trash2 size={12} />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Document Content Viewport */}
            <div className="h-[430px] w-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                        <RefreshCw size={26} className="animate-spin text-gold-400" />
                        <span className="text-xs font-mono text-slate-400">
                            {language === 'ta' ? 'ஆவணம் ஏற்றப்படுகிறது...' : 'Loading document preview...'}
                        </span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
                        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-200">
                                {language === 'ta' ? 'ஆவண மாதிரியை காண்பிக்க முடியவில்லை' : 'Unable to preview inline'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {language === 'ta' ? 'உலாவியில் நேரடியாக திறக்க கீழே உள்ள பொத்தானை கிளிக் செய்யவும்.' : 'Please open the document directly in a new tab or download it.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenExternal}
                            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-gold-500/20 transition"
                        >
                            <span>{language === 'ta' ? 'புதிய சாளரத்தில் திற' : 'Open Document'}</span>
                            <ExternalLink size={13} />
                        </button>
                    </div>
                ) : isPdf ? (
                    <div className="w-full h-full relative">
                        <iframe
                            key={blobUrl || docUrl}
                            src={`${blobUrl || docUrl}#toolbar=1&navpanes=0`}
                            title={fileName}
                            className="w-full h-full border-0 rounded-b-xl bg-slate-900"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                        <img
                            src={blobUrl || docUrl}
                            alt={fileName}
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                            className="max-h-full max-w-full object-contain rounded-lg shadow-lg transition-transform duration-150 ease-out"
                            onError={() => setError('Image failed to render')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
