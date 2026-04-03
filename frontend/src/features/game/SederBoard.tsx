import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { CharacterAvatar } from "../../components/CharacterAvatar";
import type { PuzzleCharacter, PuzzleConstraint } from "../../types/api";
import { seatLabels, seatNumber } from "../../utils/puzzle";

function DraggableCharacter({
  character,
  dragId,
  compact = false,
  disabled = false,
}: {
  character: PuzzleCharacter;
  dragId: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 20 : 1,
      }}
      {...listeners}
      {...attributes}
      className={`rounded-2xl border border-white/70 bg-white/92 shadow-lg transition ${
        compact ? "p-3" : "p-4"
      } ${disabled ? "cursor-default" : "cursor-grab"} ${isDragging ? "scale-105 shadow-2xl" : ""}`}
    >
      <div className="flex items-center gap-3 text-right">
        <CharacterAvatar
          name={character.name}
          imageUrl={character.image_url}
          size={compact ? "sm" : "md"}
        />
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{character.name}</p>
          <p className="mt-1 text-xs text-ink/60">{character.role}</p>
        </div>
      </div>
    </div>
  );
}

function SeatDropZone({
  seatLabel,
  character,
  readOnly,
}: {
  seatLabel: string;
  character?: PuzzleCharacter;
  readOnly?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: seatLabel,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[126px] w-[168px] flex-col justify-center rounded-[1.7rem] border px-4 py-3 text-center transition ${
        isOver
          ? "border-wine bg-wine/10 shadow-lg"
          : "border-white/80 bg-white/72 backdrop-blur-md"
      }`}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-wine/70">
        כיסא {seatNumber(seatLabel)}
      </p>
      {character ? (
        <DraggableCharacter
          character={character}
          compact
          disabled={readOnly}
          dragId={character.name || `${seatLabel}-character`}
        />
      ) : (
        <p className="text-sm text-ink/45">גררו לכאן דמות</p>
      )}
    </div>
  );
}

function Pool({
  characters,
  readOnly,
}: {
  characters: PuzzleCharacter[];
  readOnly?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: "pool",
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[2rem] border px-4 py-4 transition ${
        isOver ? "border-wine bg-wine/8" : "border-white/80 bg-white/65"
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10">
        {characters.map((character, index) => (
          <DraggableCharacter
            key={`${character.name}-${index}`}
            character={character}
            compact
            disabled={readOnly}
            dragId={character.name || `pool-character-${index}`}
          />
        ))}
        {characters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-wine/20 px-4 py-6 text-sm text-ink/50 sm:col-span-2 lg:col-span-5 xl:col-span-10">
            כל הדמויות כבר הונחו על השולחן.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StaticCharacterCard({
  character,
}: {
  character: PuzzleCharacter;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/50 p-3 shadow-sm opacity-65">
      <div className="flex items-center gap-3 text-right">
        <CharacterAvatar
          name={character.name}
          imageUrl={character.image_url}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{character.name}</p>
          <p className="mt-1 text-xs text-ink/60">{character.role}</p>
        </div>
      </div>
    </div>
  );
}

function cluesForCharacter(
  characterName: string,
  constraints: PuzzleConstraint[],
): string[] {
  return constraints
    .filter((constraint) =>
      ["character", "characterA", "characterB", "leftCharacter", "rightCharacter"].some(
        (key) => constraint.params[key] === characterName,
      ),
    )
    .map((constraint) => constraint.text);
}

function CharacterLaneCard({
  character,
  clueTexts,
  placed,
  readOnly,
  dragId,
}: {
  character: PuzzleCharacter;
  clueTexts: string[];
  placed: boolean;
  readOnly?: boolean;
  dragId: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-white/70 bg-white/72 p-3 backdrop-blur-sm">
      {placed ? (
        <StaticCharacterCard character={character} />
      ) : (
        <DraggableCharacter
          character={character}
          compact
          disabled={readOnly}
          dragId={dragId}
        />
      )}

      {clueTexts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {clueTexts.map((clueText) => (
            <li
              key={`${character.name}-${clueText}`}
              className="rounded-2xl border border-parchment/80 bg-parchment/55 px-3 py-2 text-[13px] leading-6 text-ink/78"
            >
              {clueText}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PoolColumn({
  id,
  characters,
  placedNames,
  constraints,
  readOnly,
}: {
  id: string;
  characters: PuzzleCharacter[];
  placedNames: Set<string>;
  constraints: PuzzleConstraint[];
  readOnly?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={`hidden rounded-[2rem] border px-4 py-5 xl:block ${
        isOver ? "border-wine bg-wine/8" : "border-white/80 bg-white/65"
      }`}
    >
      <div className="space-y-3">
        {characters.map((character, index) => (
          <CharacterLaneCard
            key={`${character.name}-${index}`}
            character={character}
            clueTexts={cluesForCharacter(character.name, constraints)}
            placed={placedNames.has(character.name)}
            readOnly={readOnly}
            dragId={character.name || `${id}-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function findCharacterByName(
  characters: PuzzleCharacter[],
  name: string | undefined,
): PuzzleCharacter | undefined {
  return characters.find((character) => character.name === name);
}

export function SederBoard({
  seatCount,
  characters,
  constraints = [],
  placements,
  onChange,
  readOnly = false,
}: {
  seatCount: number;
  characters: PuzzleCharacter[];
  constraints?: PuzzleConstraint[];
  placements: Record<string, string>;
  onChange?: (placements: Record<string, string>) => void;
  readOnly?: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const seats = seatLabels(seatCount);
  const placedNames = new Set(Object.values(placements));
  const unplacedCharacters = characters.filter((character) => !placedNames.has(character.name));
  const midpoint = Math.ceil(characters.length / 2);
  const leftCharacters = characters.slice(0, midpoint);
  const rightCharacters = characters.slice(midpoint);
  const showPool = !readOnly || unplacedCharacters.length > 0;

  function handleDragEnd(event: DragEndEvent) {
    if (readOnly || !event.over || !onChange) {
      return;
    }
    const characterName = String(event.active.id);
    const destination = String(event.over.id);
    const currentSeat =
      Object.entries(placements).find(([, name]) => name === characterName)?.[0] ?? null;
    if (destination === currentSeat) {
      return;
    }

    const nextPlacements = { ...placements };
    if (currentSeat) {
      delete nextPlacements[currentSeat];
    }

    if (destination === "pool" || destination === "pool-left" || destination === "pool-right") {
      onChange(nextPlacements);
      return;
    }

    const displacedCharacter = nextPlacements[destination];
    if (displacedCharacter && currentSeat) {
      nextPlacements[currentSeat] = displacedCharacter;
    } else if (displacedCharacter) {
      delete nextPlacements[destination];
    }
    nextPlacements[destination] = characterName;
    onChange(nextPlacements);
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {showPool ? (
          <div className="xl:hidden">
            <Pool characters={unplacedCharacters} readOnly={readOnly} />
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)_16rem] xl:items-start">
          {showPool ? (
            <PoolColumn
              id="pool-left"
              characters={leftCharacters}
              placedNames={placedNames}
              constraints={constraints}
              readOnly={readOnly}
            />
          ) : (
            <div className="hidden xl:block" />
          )}

          <div className="soft-panel overflow-hidden px-4 py-6 md:px-6">
            <div className="relative mx-auto h-[620px] max-w-4xl">
              <div className="table-surface absolute left-1/2 top-1/2 flex h-[290px] w-[74%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[120px] border border-white/40 shadow-2xl">
                <p className="font-display text-3xl text-wine">שולחן ליל הסדר</p>
              </div>

              {seats.map((seatLabel, index) => {
                const angle = (-90 + (360 / seats.length) * index) * (Math.PI / 180);
                const x = 50 + Math.cos(angle) * 39;
                const y = 50 + Math.sin(angle) * 36;
                return (
                  <div
                    key={seatLabel}
                    className="absolute"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <SeatDropZone
                      seatLabel={seatLabel}
                      character={findCharacterByName(characters, placements[seatLabel])}
                      readOnly={readOnly}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {showPool ? (
            <PoolColumn
              id="pool-right"
              characters={rightCharacters}
              placedNames={placedNames}
              constraints={constraints}
              readOnly={readOnly}
            />
          ) : (
            <div className="hidden xl:block" />
          )}
        </div>
      </div>
    </DndContext>
  );
}
