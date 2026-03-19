import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {

  // ─────────────────────────────────────────────
  // STATE: The user's current selections
  // ─────────────────────────────────────────────
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [fobButtons, setFobButtons] = useState('');

  // ─────────────────────────────────────────────
  // STATE: The dropdown option lists
  // ─────────────────────────────────────────────
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [availableFobButtons, setAvailableFobButtons] = useState([]);

  // ─────────────────────────────────────────────
  // STATE: Search results, UI feedback, debug info
  // ─────────────────────────────────────────────
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────
  // REFS: Used to scroll to the next step after selection 
  // ─────────────────────────────────────────────
  const makeRef = useRef(null);
  const modelRef = useRef(null);
  const fobRef = useRef(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // ─────────────────────────────────────────────
  // FETCH YEARS
  // Runs once on page load. Gets all valid years from
  // the database, filtered to 1990 through next year.
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fetchYears = async () => {
      let allData = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('key_database')
          .select('year')
          .gte('year', 1990)
          .lte('year', new Date().getFullYear() + 1)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        page++;
      }

      const currentYear = new Date().getFullYear();
      const uniqueYears = [...new Set(allData.map((row) => row.year))]
        .filter((y) => y >= 1990 && y <= currentYear + 1)
        .sort((a, b) => b - a);

      setYears(uniqueYears);
    };

    fetchYears();
  }, []);


  // ─────────────────────────────────────────────
  // FETCH MAKES
  // Runs when year changes. Only gets makes that
  // exist for the selected year.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!year) return;

    const fetchMakes = async () => {
      let allData = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('key_database')
          .select('make')
          .eq('year', Number(year))
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        page++;
      }

      const uniqueMakes = [...new Set(allData.map((row) => row.make))].sort();
      setMakes(uniqueMakes);
    };

    fetchMakes();
  }, [year]);


  // ─────────────────────────────────────────────
  // FETCH MODELS
  // Runs when year or make changes. Only gets models
  // that exist for the selected year AND make.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!year || !make) return;

    const fetchModels = async () => {
      let allData = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('key_database')
          .select('model')
          .eq('year', Number(year))
          .eq('make', make)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        page++;
      }

      const uniqueModels = [...new Set(allData.map((row) => row.model))].sort();
      setModels(uniqueModels);
    };

    fetchModels();
  }, [year, make]);


  // ─────────────────────────────────────────────
  // FETCH FOB BUTTON OPTIONS
  // Runs when model is selected. Checks which
  // fob button counts actually exist in the database
  // for this exact vehicle.
  // Auto-selects if only one option exists.
  // Also populates the yellow debug box on screen.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!year || !make || !model) return;

    setFobButtons('');
    setAvailableFobButtons([]);

    const fetchFobOptions = async () => {
      const { data, error } = await supabase
        .from('key_database')
        .select('fob_buttons')
        .eq('year', Number(year))
        .eq('make', make)
        .eq('model', model);


      if (error || !data) return;

      const uniqueButtons = [...new Set(data.map((row) => row.fob_buttons))].sort((a, b) => a - b);
      setAvailableFobButtons(uniqueButtons);

      // If only one option exists, auto-select it and skip the question
      if (uniqueButtons.length === 1) {
        setFobButtons(uniqueButtons[0]);
      }
    };

    fetchFobOptions();
  }, [year, make, model]);

  // ─────────────────────────────────────────────
  // SCROLL HELPER
  // Smoothly scrolls to the next step after a selection
  // ─────────────────────────────────────────────
  const scrollTo = (ref, delay = 300) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, delay);
  };

  // ─────────────────────────────────────────────
  // SEARCH
  // Runs when user clicks the Search button.
  // Queries with all four filters to find matching rows.
  // ─────────────────────────────────────────────
  const searchKeys = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    const { data, error } = await supabase
      .from('key_database')
      .select('fob_buttons, fcc_id, part_number')
      .eq('year', Number(year))
      .eq('make', make)
      .eq('model', model)
      .eq('fob_buttons', fobButtons);

    if (error) {
      setError('Something went wrong. Please try again.');
    } else if (data.length === 0) {
      setError('No results found for this vehicle.');
    } else {
      setResults(data);
    }

    setLoading(false);
    scrollTo(resultsRef, 500);  // Scrolls to results after search completes
  };


  // ─────────────────────────────────────────────
  // RESET
  // Clears all selections and results so the user
  // can start a new search from scratch.
  // ─────────────────────────────────────────────
  const resetSearch = () => {
    setYear('');
    setMake('');
    setModel('');
    setFobButtons('');
    setResults(null);
    setError(null);
    setMakes([]);
    setModels([]);
    setAvailableFobButtons([]);
  };


  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="app-card">
      <div className="app-title">
        <h1>Vehicle</h1>
        <h1>Key Lookup</h1>
      </div>

      <div className="step">
        <label>Year</label>
        {/* ── STEP 1: Year ── */}
       <select
         value={year}
         onChange={(e) => {
            setYear(e.target.value);
           setMake('');
            setModel('');
            setFobButtons('');
            setResults(null);
            setError(null);
            setMakes([]);
            setModels([]);
            scrollTo(makeRef);
          }}
        >
          <option value="">Select Year</option>
         {years.map((y) => (
           <option key={y} value={y}>{y}</option>
         ))}
        </select>

      </div>

      {/* ── STEP 2: Make ── */}
      {year && (
        <div className="step" ref={makeRef}>
         <label>Make</label>
          <select
           value={make}
            onChange={(e) => {
             setMake(e.target.value);
             setModel('');
             setFobButtons('');
              setResults(null);
              setError(null);
             setModels([]);
              scrollTo(modelRef);
           }}
         >
            <option value="">Select Make</option>
           {makes.map((m) => (
             <option key={m} value={m}>{m}</option>
            ))}
          </select>
         </div>
      )}

      {/* ── STEP 3: Model ── */}
      {make && (
       <div className="step" ref={modelRef}>
        <label>Model</label>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setFobButtons('');
            setResults(null);
            setError(null);
            scrollTo(fobRef);
          }}
        >
          <option value="">Select Model</option>
          {models.map((mo) => (
            <option key={mo} value={mo}>{mo}</option>
          ))}
        </select>
       </div>
      )}

      {/* ── STEP 4: Fob button count ──
          Only shows the button counts that actually exist in
          the database for this vehicle. Auto-selects if only
          one option exists. ── */}
        {model && availableFobButtons.length > 1 && (
          <div className="step" ref={fobRef}>
            <p>How many buttons does the fob have?</p>
            <div className="fob-buttons">
              {availableFobButtons.map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setFobButtons(num);
                    setResults(null);
                    setError(null);
                    scrollTo(searchRef, 200);
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
            {fobButtons && <p>Selected: {fobButtons}</p>}
          </div>
        )}  

      {/* ── SEARCH BUTTON ── */}
      {fobButtons && (
        <div ref={searchRef}>
          <button onClick={searchKeys}>Search</button>
        </div>
      )}

      {/* ── FEEDBACK STATES ── */}
      {loading && <p>Searching...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ── RESULTS ── */}
      {results && (
        <div className="results-section" ref={resultsRef}>
          <h2 className="results-title">Results</h2>
          {results.map((r, index) => (
            <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <p><strong>Part Number:</strong> {r.part_number}</p>
              <p><strong>FCC ID:</strong> {r.fcc_id}</p>
              <p><strong>Fob Buttons:</strong> {r.fob_buttons}</p>
            </div>
          ))}
          <button onClick={resetSearch}>Start Over</button>
        </div>
      )}

    </div>
  );
}

export default App;