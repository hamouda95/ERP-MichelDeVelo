/**
 * ============================================================================ 
 * KANBAN COLUMN COMPONENT - MODERNE DND-KIT AVEC INTER-COLONNES
 * ============================================================================ 
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import RepairCard from './RepairCard';

const KanbanColumn = ({ 
  column, 
  repairs, 
  onRepairClick, 
  PRIORITY_OPTIONS 
}) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className={`rounded-lg border ${column.color} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <column.icon className="w-5 h-5" />
          <h3 className="font-semibold">{column.title}</h3>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
          {repairs.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`min-h-[200px] space-y-2 transition-colors ${
          column.id === 'pending' ? 'bg-yellow-50/30' :
          column.id === 'in_progress' ? 'bg-blue-50/30' :
          column.id === 'completed' ? 'bg-green-50/30' :
          'bg-emerald-50/30'
        }`}
      >
        {repairs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Aucune réparation</p>
          </div>
        ) : (
          <SortableContext 
            items={repairs.map(r => r.id.toString())} 
            strategy={verticalListSortingStrategy}
          >
            {repairs.map((repair) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onClick={onRepairClick}
                PRIORITY_OPTIONS={PRIORITY_OPTIONS}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
