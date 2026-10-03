import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-theme-main text-theme-primary transition-colors">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
