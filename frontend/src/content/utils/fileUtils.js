// Supported file types that can be safely converted to strings
const SUPPORTED_FILE_TYPES = {
    'text/plain': ['.txt', '.md', '.log'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    // 'text/javascript': ['.js', '.jsx'],
    // 'text/html': ['.html', '.htm'],
    // 'text/css': ['.css'],
    // 'application/xml': ['.xml'],
    // 'text/xml': ['.xml'],
    // 'application/yaml': ['.yml', '.yaml'],
    'text/markdown': ['.md'],
  };
  
  // Safety limits
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 10MB
  const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB text content
  
  // File validation and safety checks
  export const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  
    // Check if file type is supported
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isSupported = Object.entries(SUPPORTED_FILE_TYPES).some(([mimeType, extensions]) => {
      return file.type === mimeType || extensions.includes(fileExtension);
    });
  
    if (!isSupported) {
      throw new Error(`Unsupported file type. Supported: ${Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')}`);
    }
  
    return true;
  };
  
  // Safe content reading with serialization
  export const readAndSerializeFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          let content = event.target.result;
          
          // Validate content length
          if (content.length > MAX_CONTENT_LENGTH) {
            throw new Error(`Content too large. Maximum: ${MAX_CONTENT_LENGTH / 1024}KB`);
          }
  
          // Basic content safety checks
          if (typeof content !== 'string') {
            throw new Error('File content could not be converted to string');
          }
  
          // Check for potentially unsafe content (basic checks)
          const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
            /javascript:/gi, // Javascript protocols
            /data:.*base64/gi, // Base64 data URLs
            /eval\s*\(/gi, // Eval statements
          ];
  
          const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(content));
          if (hasSuspiciousContent) {
            console.warn('File contains potentially unsafe content');
            // You can either reject or sanitize - here we'll warn but continue
          }
  
          // Serialize file metadata along with content
          const serializedFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: content,
            uploadedAt: new Date().toISOString(),
            contentLength: content.length,
            encoding: 'utf-8'
          };
  
          resolve(serializedFile);
        } catch (error) {
          reject(new Error(`Content processing failed: ${error.message}`));
        }
      };
  
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
  
      // Read as text with UTF-8 encoding
      reader.readAsText(file, 'utf-8');
    });
  };