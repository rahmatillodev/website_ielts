import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Image } from "lucide-react";
const LandingNavbar = () => {
  return (
    <div className="w-full h-16 bg-white shadow-md">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Image src="/logo.png" alt="logo" width={100} height={50} />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/pricing">Pricing</Link>
          <Link to="/resources">Resources</Link>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <Link to="/login" >Login</Link>
          </Button>
          <Button variant="default">
        <Link to="/signup" >Sing Up</Link>

          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingNavbar;
