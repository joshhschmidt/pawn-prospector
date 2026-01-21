import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PGNUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  isLoading: boolean;
}

export const PGNUpload = ({ onUpload, isLoading }: PGNUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.pgn') || file.type === 'application/x-chess-pgn'
    );
    
    if (droppedFiles.length === 0) {
      setError('Please upload PGN files only');
      return;
    }
    
    setError('');
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      file => file.name.endsWith('.pgn')
    );
    
    if (selectedFiles.length === 0) {
      setError('Please upload PGN files only');
      return;
    }
    
    setError('');
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please add at least one PGN file');
      return;
    }
    
    try {
      await onUpload(files);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-accent/20 p-2">
          <Upload className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Upload PGN Files</h3>
          <p className="text-sm text-muted-foreground">Drag and drop or browse for PGN files</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-muted-foreground'
        )}
      >
        <input
          type="file"
          accept=".pgn"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop PGN files here or{' '}
            <span className="text-primary font-medium">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Multiple files supported
          </p>
        </div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center justify-between rounded-lg bg-secondary p-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="rounded-full p-1 hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          className="mt-4 w-full"
          variant="accent"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Process {files.length} File{files.length > 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
};
