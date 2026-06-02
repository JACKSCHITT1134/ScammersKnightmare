import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Home } from '@/pages/Home';
import { Dashboard } from '@/pages/Dashboard';
import { Scan } from '@/pages/Scan';
import { History } from '@/pages/History';
import { SignIn } from '@/pages/SignIn';
import { Admin } from '@/pages/Admin';
import { AdminLogin } from '@/pages/AdminLogin';
import { AIChat } from '@/pages/AIChat';
import { BlockLists } from '@/pages/BlockLists';
import { ReverseLookup } from '@/pages/ReverseLookup';
import { AutoMonitor } from '@/pages/AutoMonitor';
import { DarkWebMonitor } from '@/pages/DarkWebMonitor';
import { SocialMediaAnalyzer } from '@/pages/SocialMediaAnalyzer';
import { SubscriptionManagement } from '@/pages/SubscriptionManagement';
import { AgentControl } from '@/pages/AgentControl';
import { PredatorHunter } from '@/pages/PredatorHunter';
import { IPScanner } from '@/pages/IPScanner';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <Scan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute>
                <AIChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/block-lists"
            element={
              <ProtectedRoute>
                <BlockLists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reverse-lookup"
            element={
              <ProtectedRoute>
                <ReverseLookup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auto-monitor"
            element={
              <ProtectedRoute>
                <AutoMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dark-web"
            element={
              <ProtectedRoute>
                <DarkWebMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/social-analyzer"
            element={
              <ProtectedRoute>
                <SocialMediaAnalyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <AgentControl />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predator-hunter"
            element={
              <ProtectedRoute>
                <PredatorHunter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ip-scanner"
            element={
              <ProtectedRoute>
                <IPScanner />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
