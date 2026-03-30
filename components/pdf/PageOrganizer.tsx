"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { FileText, X, Plus } from "lucide-react";
import PageThumbnail from "./PageThumbnail";

export interface PageItem {
  id: string;
  fileId: string;
  fileIndex: number;
  originalIndex: number; // original 0-based index
  label: string; // display string
  isDisabled?: boolean; // toggle state
}

export interface PageGroup {
  id: string;
  name: string;
  pages: PageItem[];
}

interface PageOrganizerProps {
  groups: PageGroup[];
  pdfDataMap: Record<string, ArrayBuffer>;
  onReorder: (groups: PageGroup[]) => void;
  onToggle: (pageId: string, groupId: string) => void;
}

export default function PageOrganizer({ groups, pdfDataMap, onReorder, onToggle }: PageOrganizerProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const newGroups = [...groups];
    
    const sourceGroupIndex = newGroups.findIndex(g => g.id === source.droppableId);
    const destGroupIndex = newGroups.findIndex(g => g.id === destination.droppableId);

    if (sourceGroupIndex === -1 || destGroupIndex === -1) return;

    // Isolate clones to avoid state mutation
    const sourceGroup = { ...newGroups[sourceGroupIndex], pages: [...newGroups[sourceGroupIndex].pages] };
    const destGroup = source.droppableId === destination.droppableId 
      ? sourceGroup 
      : { ...newGroups[destGroupIndex], pages: [...newGroups[destGroupIndex].pages] };

    // Move the item
    const [removed] = sourceGroup.pages.splice(source.index, 1);
    destGroup.pages.splice(destination.index, 0, removed);

    // Apply back into state
    newGroups[sourceGroupIndex] = sourceGroup;
    newGroups[destGroupIndex] = destGroup;

    onReorder(newGroups);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {groups.map((group) => {
          const activeCount = group.pages.filter(p => !p.isDisabled).length;

          return (
            <div key={group.id} className="space-y-2">
              
              {/* Group Header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold text-white/90 truncate max-w-sm">
                  {group.name}
                </h3>
                <span className="text-xs text-white/40">{activeCount} Pages</span>
              </div>

              {/* Droppable Container */}
              <Droppable droppableId={group.id} direction="horizontal">
                {(droppableProvided, droppableSnapshot) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className={`flex flex-wrap gap-4 p-4 rounded-xl border-2 border-dashed min-h-[200px] transition-colors ${
                      droppableSnapshot.isDraggingOver
                        ? "border-accent-violet/50 bg-accent-violet/5"
                        : "border-border bg-surface-2"
                    }`}
                  >
                    {group.pages.map((page, i) => (
                      <Draggable key={page.id} draggableId={page.id} index={i}>
                        {(draggableProvided, draggableSnapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`relative flex flex-col items-center group ${
                              draggableSnapshot.isDragging ? "z-50" : ""
                            }`}
                          >
                            <div
                              {...draggableProvided.dragHandleProps}
                              className={`flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing w-full h-full relative transition-all duration-300 ${
                                page.isDisabled ? "opacity-40 grayscale" : "opacity-100"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div
                                className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                  draggableSnapshot.isDragging
                                    ? "border-accent-violet shadow-glow-violet rotate-2 scale-105"
                                    : page.isDisabled 
                                      ? "border-border"
                                      : "border-border-subtle hover:border-accent-violet/40"
                                }`}
                              >
                                {page.isDisabled ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      onToggle(page.id, group.id);
                                    }}
                                    className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-emerald-500/50 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all scale-110"
                                    title="Restore page"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      onToggle(page.id, group.id);
                                    }}
                                    className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/20 flex items-center justify-center text-white hover:bg-accent-rose hover:border-accent-rose hover:text-white transition-all"
                                    title="Disable page"
                                  >
                                    <X className="w-3 h-3 text-white/70" />
                                  </button>
                                )}

                                {pdfDataMap[page.fileId] ? (
                                  <PageThumbnail
                                    pdfData={pdfDataMap[page.fileId]}
                                    pageNumber={page.originalIndex + 1}
                                    width={100}
                                  />
                                ) : (
                                  <div className="w-[100px] h-[141px] bg-surface-3 flex flex-col items-center justify-center gap-2">
                                    <FileText className="w-6 h-6 text-white/20" />
                                  </div>
                                )}

                                {page.isDisabled && (
                                  <div className="absolute inset-0 bg-surface-base/10 backdrop-blur-[1px] pointer-events-none" />
                                )}
                              </div>

                              {/* Page label */}
                              <div className="flex flex-col items-center max-w-[100px] text-center">
                                <span className={`text-xs font-medium truncate w-full ${page.isDisabled ? "text-white/30 line-through decoration-white/20" : "text-white/70"}`}>
                                  {page.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {droppableProvided.placeholder}

                    {group.pages.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-white/20 text-sm italic">
                        Container empty — Drag pages here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
