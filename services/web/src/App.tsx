import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { NewReviewPage } from './pages/NewReviewPage';
import { ReviewDetailsPage } from './pages/ReviewDetailsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProjectsPage } from './pages/ProjectsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/new-review" element={<NewReviewPage />} />
              <Route path="/reviews/:reviewId" element={<ReviewDetailsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
