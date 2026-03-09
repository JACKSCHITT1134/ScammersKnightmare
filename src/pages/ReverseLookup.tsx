import { useState } from 'react';
import { Search, Phone, MapPin, Wifi, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LookupResult {
  phone_number: string;
  owner_info: {
    name?: string;
    type: string;
    status: string;
  };
  carrier_info?: {
    name: string;
    type: string;
  };
  location_info?: {
    city: string;
    state: string;
    country: string;
    timezone: string;
  };
  risk_assessment?: {
    spam_score: number;
    is_voip: boolean;
    is_valid: boolean;
  };
}

export function ReverseLookup() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  const handleLookup = async () => {
    if (!phoneNumber.trim()) return;

    setLoading(true);
    try {
      // TODO: Call reverse lookup API
      // For now, mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResult({
        phone_number: phoneNumber,
        owner_info: {
          name: 'Business Name / Private',
          type: 'Mobile',
          status: 'Active'
        },
        carrier_info: {
          name: 'AT&T Mobility',
          type: 'Wireless'
        },
        location_info: {
          city: 'Los Angeles',
          state: 'CA',
          country: 'United States',
          timezone: 'America/Los_Angeles'
        },
        risk_assessment: {
          spam_score: 35,
          is_voip: false,
          is_valid: true
        }
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Reverse Phone Lookup</h1>
          <p className="text-muted-foreground">
            Identify unknown callers and verify phone numbers
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="flex-1"
              />
              <Button
                onClick={handleLookup}
                disabled={loading || !phoneNumber.trim()}
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Looking up...' : 'Lookup'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            {/* Phone Number Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Phone Number Information
                </CardTitle>
                <CardDescription>{result.phone_number}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Owner</p>
                    <p className="font-medium">{result.owner_info.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                    <Badge>{result.owner_info.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline">{result.owner_info.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrier Info */}
            {result.carrier_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    Carrier Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Carrier</p>
                      <p className="font-medium">{result.carrier_info.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Network Type</p>
                      <Badge>{result.carrier_info.type}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Info */}
            {result.location_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    Location Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">City</p>
                      <p className="font-medium">{result.location_info.city}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">State</p>
                      <p className="font-medium">{result.location_info.state}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Country</p>
                      <p className="font-medium">{result.location_info.country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Timezone</p>
                      <Badge variant="outline">{result.location_info.timezone}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessment */}
            {result.risk_assessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Spam Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${result.risk_assessment.spam_score}%` }}
                          />
                        </div>
                        <span className="font-medium">{result.risk_assessment.spam_score}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">VoIP Number</p>
                      <Badge variant={result.risk_assessment.is_voip ? 'destructive' : 'default'}>
                        {result.risk_assessment.is_voip ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valid Number</p>
                      <Badge variant={result.risk_assessment.is_valid ? 'default' : 'destructive'}>
                        {result.risk_assessment.is_valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
