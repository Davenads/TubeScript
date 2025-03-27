import React from 'react';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  return (
    <header className="header">
      <h1 className="text-gradient">TubeScript</h1>
      <p>Generate speaker-separated transcripts from YouTube videos</p>
      <ThemeToggle />
    </header>
  );
};

export default Header;