// Footer.jsx
import React from 'react';
import { 
  FaBookOpen, 
  FaHeadphonesAlt, 
  FaTag, 
  FaQuestionCircle, 
  FaEnvelope, 
  FaFileContract,
  FaGlobe 
} from 'react-icons/fa';

const LandingFooter = () => {
  return (
    <footer className="bg-background-light text-black py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start space-y-8 md:space-y-0">
          
          {/* Brand Section */}
          <div className="md:w-1/3">
            <div className="flex items-center space-x-2 mb-4">
              <FaGlobe className="text-blue-400 text-2xl" />
              <h1 className="text-2xl font-bold">IELTS Sim</h1>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              The most realistic Computer-Delivered IELTS simulator on the web. 
              Built by educators and tech experts.
            </p>
            <div className="flex space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="font-bold">E</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <span className="font-bold">T</span>
              </div>
            </div>
          </div>
          
          {/* Platform Links */}
          <div className="md:w-1/4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="bg-blue-500 p-1 rounded mr-2">
                <FaBookOpen className="text-sm" />
              </span>
              Platform
            </h2>
            <ul className="space-y-2">
              <li className="flex items-center hover:text-blue-300 transition-colors cursor-pointer">
                <FaBookOpen className="mr-2 text-blue-400" />
                Reading Simulator
              </li>
              <li className="flex items-center hover:text-blue-300 transition-colors cursor-pointer">
                <FaHeadphonesAlt className="mr-2 text-blue-400" />
                Listening Simulator
              </li>
              <li className="flex items-center hover:text-blue-300 transition-colors cursor-pointer">
                <FaTag className="mr-2 text-blue-400" />
                Pricing
              </li>
            </ul>
          </div>
          
          {/* Support Links */}
          <div className="md:w-1/4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="bg-green-500 p-1 rounded mr-2">
                <FaQuestionCircle className="text-sm" />
              </span>
              Support
            </h2>
            <ul className="space-y-2">
              <li className="flex items-center hover:text-green-300 transition-colors cursor-pointer">
                <FaQuestionCircle className="mr-2 text-green-400" />
                Help Center
              </li>
              <li className="flex items-center hover:text-green-300 transition-colors cursor-pointer">
                <FaEnvelope className="mr-2 text-green-400" />
                Contact Us
              </li>
              <li className="flex items-center hover:text-green-300 transition-colors cursor-pointer">
                <FaFileContract className="mr-2 text-green-400" />
                Terms of Service
              </li>
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-700 my-6"></div>
        
        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 IELTS Sim. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">
              Cookie Policy
            </span>
            <span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">
              Accessibility
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;