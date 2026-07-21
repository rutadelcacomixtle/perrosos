import { useState } from "react";
import { Plus, X, Users } from "lucide-react";

interface AttendeeListProps {
  attendees: string[];
  onChange: (attendees: string[]) => void;
}

export function AttendeeList({ attendees, onChange }: AttendeeListProps) {
  const [input, setInput] = useState("");

  function add() {
    const name = input.trim();
    if (!name) return;
    onChange([...attendees, name]);
    setInput("");
  }

  function remove(name: string) {
    onChange(attendees.filter((a) => a !== name));
  }

  return (
    <div>
      <p
        className="text-xs mb-1.5 flex items-center gap-1"
        style={{ color: "#9BA3AC" }}
      >
        <Users size={11} /> Quien confirma
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              add();
            }
          }}
          placeholder="Nombre"
          style={{
            background: "#0e0f11",
            border: "1px solid #34383D",
            color: "#EDEFF2",
          }}
          className="rounded-md px-3 py-2 text-sm outline-none flex-1 min-w-0"
        />
        <button
          onClick={add}
          style={{ background: "#0e0f11", border: "1px solid #34383D" }}
          className="rounded-md px-3 cursor-pointer"
          aria-label="Agregar asistente"
        >
          <Plus size={16} color="#80C6FF" />
        </button>
      </div>
      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {attendees.map((name) => (
            <span
              key={name}
              style={{
                background: "#0e0f11",
                border: "1px solid #34383D",
                color: "#EDEFF2",
              }}
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
            >
              {name}
              <button
                onClick={() => remove(name)}
                aria-label={`Quitar ${name}`}
                className="cursor-pointer"
              >
                <X size={11} color="#6B747C" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
