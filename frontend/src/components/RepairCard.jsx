/**
 * ============================================================================ 
 * REPAIR CARD COMPONENT - MODERNE DND-KIT AVEC VISUAL FEEDBACK
 * ============================================================================ 
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PhotoIcon } from '@heroicons/react/24/outline';

const RepairCard = ({ repair, onClick, PRIORITY_OPTIONS }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: repair.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all ${
        isDragging 
          ? 'shadow-xl rotate-2 scale-105 border-blue-400 bg-blue-50' 
          : 'hover:shadow-md hover:border-gray-300 hover:shadow-lg'
      }`}
      onClick={() => onClick(repair)}
      {...attributes}
      {...listeners}
    >
      {/* Indicateur visuel de drag */}
      {isDragging && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{repair.reference_number}</p>
          <p className="text-xs text-gray-600">
            {repair.client?.name || repair.client?.first_name ? 
              `${repair.client?.name || repair.client?.first_name} ${repair.client?.last_name || ''}`.trim() : 
              'Client non spécifié'
            }
          </p>
        </div>
        {repair.priority !== 'normal' && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            PRIORITY_OPTIONS.find(p => p.value === repair.priority)?.color
          }`}>
            {PRIORITY_OPTIONS.find(p => p.value === repair.priority)?.label}
          </span>
        )}
      </div>
      
      <p className="text-xs text-gray-700 mb-2 line-clamp-2">
        {repair.description}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{repair.bike_brand}</span>
        <span>{new Date(repair.created_at).toLocaleDateString()}</span>
      </div>
      
      {repair.photo_1 && (
        <div className="mt-2">
          <PhotoIcon className="w-4 h-4 text-blue-500" />
        </div>
      )}
    </div>
  );
};

export default RepairCard;
