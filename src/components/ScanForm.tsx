import { useState } from 'react';
import { Search, Phone, Mail, Link as LinkIcon, User, Users, QrCode, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanType } from '@/types';

interface ScanFormProps {
  onScan: (type: ScanType, input: string) => void;
  isScanning: boolean;
}

const scanTypes: { type: ScanType; label: string; icon: any; placeholder: string; description: string }[] = [
  { 
    type: 'phone', 
    label: 'Phone Number', 
    icon: Phone, 
    placeholder: '+1 (555) 123-4567',
    description: 'Reverse lookup, carrier verification, spam check'
  },
  { 
    type: 'email', 
    label: 'Email Address', 
    icon: Mail, 
    placeholder: 'suspicious@example.com',
    description: 'Disposable check, breach history, reputation'
  },
  { 
    type: 'url', 
    label: 'Website/Link', 
    icon: LinkIcon, 
    placeholder: 'https://suspicious-site.com',
    description: 'Phishing detection, malware scan, domain reputation'
  },
  { 
    type: 'ip', 
    label: 'IP Address', 
    icon: Shield, 
    placeholder: '192.168.1.1',
    description: 'VPN/Proxy detection, geolocation, threat intel'
  },
  { 
    type: 'username', 
    label: 'Username', 
    icon: User, 
    placeholder: '@username',
    description: 'Cross-platform search, behavioral analysis'
  },
  { 
    type: 'social-profile', 
    label: 'Social Profile', 
    icon: Users, 
    placeholder: 'Profile URL or @handle',
    description: 'Fake account detection, follower analysis, bot check'
  },
  { 
    type: 'qr-code', 
    label: 'QR Code', 
    icon: QrCode, 
    placeholder: 'Upload image or paste data',
    description: 'Malicious link detection, destination analysis'
  },
  { 
    type: 'text', 
    label: 'Text/Message', 
    icon: FileText, 
    placeholder: 'Paste suspicious message',
    description: 'Scam pattern detection, sentiment analysis'
  },
];

export function ScanForm({ onScan, isScanning }: ScanFormProps) {
  const [selectedType, setSelectedType] = useState<ScanType>('url');
  const [input, setInput] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || qrFile) {
      onScan(selectedType, input.trim() || qrFile?.name || '');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrFile(file);
      // TODO: Process QR code from image
      setInput(`QR Code from ${file.name}`);
    }
  };

  const currentType = scanTypes.find((t) => t.type === selectedType)!;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
        <div className="mb-6">
          <Label className="text-base font-semibold mb-3 block">Select Scan Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {scanTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.type}
                  onClick={() => setSelectedType(type.type)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    selectedType === type.type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground text-muted-foreground'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium text-center">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="scan-input" className="text-sm font-medium mb-2 block">
              Enter {currentType.label}
            </Label>
            <p className="text-xs text-muted-foreground mb-2">{currentType.description}</p>
            
            {selectedType === 'qr-code' ? (
              <div className="space-y-3">
                <Input
                  id="qr-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isScanning}
                  className="cursor-pointer"
                />
                <Input
                  id="scan-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Or paste QR code data directly"
                  disabled={isScanning}
                />
              </div>
            ) : selectedType === 'text' ? (
              <textarea
                id="scan-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentType.placeholder}
                disabled={isScanning}
                className="w-full min-h-[120px] px-3 py-2 border border-border rounded-md bg-background resize-none"
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  id="scan-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={currentType.placeholder}
                  disabled={isScanning}
                  className="flex-1"
                />
                <Button type="submit" disabled={isScanning || !input.trim()} size="lg">
                  <Search className="w-4 h-4 mr-2" />
                  {isScanning ? 'Scanning...' : 'Scan'}
                </Button>
              </div>
            )}
          </div>

          {selectedType === 'qr-code' || selectedType === 'text' ? (
            <Button type="submit" disabled={isScanning || (!input.trim() && !qrFile)} size="lg" className="w-full">
              <Search className="w-4 h-4 mr-2" />
              {isScanning ? 'Analyzing...' : 'Analyze Now'}
            </Button>
          ) : null}

          <div className="bg-secondary/50 rounded-md p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-1">🛡️ Knight AI Detection Engine:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Multi-factor fraud probability analysis</li>
              <li>Behavioral anomaly detection with learning</li>
              <li>Personality-driven decision making (protective, helpful, humble)</li>
              <li>Explainable AI reasoning for every decision</li>
              <li>IPQS validation backup for high-risk cases</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
