import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import "@/App.css";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AudioNotifier from "@/components/AudioNotifier";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import News from "@/pages/News";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import WorkerDashboard from "@/pages/WorkerDashboard";
import DirectorDashboard from "@/pages/DirectorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

function PublicLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" richColors />
                <AudioNotifier />
                <Routes>
                    <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                    <Route path="/products" element={<PublicLayout><Products /></PublicLayout>} />
                    <Route path="/products/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
                    <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
                    <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                    <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
                    <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
                    <Route path="/worker" element={
                        <ProtectedRoute roles={["worker"]}><WorkerDashboard /></ProtectedRoute>
                    } />
                    <Route path="/director" element={
                        <ProtectedRoute roles={["director"]}><DirectorDashboard /></ProtectedRoute>
                    } />
                    <Route path="/admin" element={
                        <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
