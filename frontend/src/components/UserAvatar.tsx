import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';

interface UserAvatarProps {
  clientId: string;
  clientName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const PersonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const UserAvatar: React.FC<UserAvatarProps> = ({
  clientId,
  clientName,
  className = '',
  size = 'md'
}) => {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tamanhos predefinidos
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        setIsLoading(true);
        const response = await dashboardAPI.getClientProfilePicture(clientId);
        
        if (response?.link) {
          setProfilePictureUrl(response.link);
          setImageError(false);
        } else {
          setProfilePictureUrl(null);
        }
      } catch (error) {
        console.error('Erro ao buscar imagem de perfil:', error);
        setProfilePictureUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchProfilePicture();
    }
  }, [clientId]);

  const handleImageError = () => {
    setImageError(true);
    setProfilePictureUrl(null);
  };

  // Se está carregando, mostrar placeholder
  if (isLoading) {
    return (
      <div 
        className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 animate-pulse flex items-center justify-center`}
      >
        <div className={`${iconSizes[size]} bg-gray-300 dark:bg-gray-500 rounded-full`} />
      </div>
    );
  }

  // Se tem imagem de perfil e não houve erro, mostrar a imagem
  if (profilePictureUrl && !imageError) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative`}>
        <img
          src={profilePictureUrl}
          alt={clientName ? `Foto de perfil de ${clientName}` : 'Foto de perfil'}
          className="w-full h-full rounded-full object-cover shadow-sm"
          onError={handleImageError}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: mostrar ícone de pessoa
  return (
    <div 
      className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center`}
    >
      <PersonIcon 
        className={`${iconSizes[size]} text-gray-600 dark:text-gray-300`} 
      />
    </div>
  );
};

export default UserAvatar; 