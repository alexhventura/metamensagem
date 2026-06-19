import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Youtube, Facebook } from 'lucide-react';

interface SocialHubProps {
  tema: string;
}

export default function SocialHub({ tema }: SocialHubProps) {
  const networks = [
    {
      name: 'Instagram',
      icon: <Instagram size={20} />,
      link: 'https://www.instagram.com/metamensagem/',
      color: 'hover:text-[#E1306C]'
    },
    {
      name: 'YouTube',
      icon: <Youtube size={20} />,
      link: 'https://www.youtube.com/@metamensagem',
      color: 'hover:text-[#FF0000]'
    },
    {
      name: 'Facebook',
      icon: <Facebook size={20} />,
      link: 'https://www.facebook.com/metamensagem/',
      color: 'hover:text-[#1877F2]'
    }
  ];

  return (
    <section className="w-full flex justify-center py-4 px-4">
      <div className="flex items-center gap-8 md:gap-12">
        {networks.map((net) => (
          <motion.a
            key={net.name}
            href={net.link}
            target="_blank"
            rel="noopener noreferrer"
            title={net.name}
            aria-label={`Seguir no ${net.name}`}
            whileHover={{ y: -2 }}
            className={`transition-all duration-300 ${
              tema === 'light' ? 'text-zinc-400' : 'text-zinc-400'
            } ${net.color}`}
          >
            {net.icon}
          </motion.a>
        ))}
      </div>
    </section>
  );
}
