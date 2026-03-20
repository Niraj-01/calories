import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./CameraModal.module.css";

export default function CameraModal({ meal, onAdd, onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // States for user adjustment
  const [servingAmount, setServingAmount] = useState(100);
  const [servingUnit, setServingUnit] = useState("g");
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setPrediction(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setLoading(true);
    setError(null);
    setPrediction(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to analyze image");
      }

      setPrediction(data);
      // Reset to 100g by default for predictions
      setServingAmount(100);
      setServingUnit("g");
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateMacros = () => {
    if (!prediction) return null;
    
    const multiplier = servingAmount / 100;
    
    return {
      calories: Math.round(prediction.calories * multiplier),
      protein: Math.round(prediction.protein * multiplier * 10) / 10,
      carbs: Math.round(prediction.carbs * multiplier * 10) / 10,
      fat: Math.round(prediction.fat * multiplier * 10) / 10,
    };
  };

  const handleAddSubmit = () => {
    if (!prediction) return;
    
    // We pass the base 100g values and let the parent handle the math,
    // OR we pass the calculated values. The existing code handleAddFood does math:
    // math: Math.round(food.calories * (food.servingAmount || 100) / 100)
    // So we just need to pass the base values and the serving info
    const foodData = {
      name: prediction.name.charAt(0).toUpperCase() + prediction.name.slice(1),
      brand: "AI Estimate",
      calories: prediction.calories, // Base per 100g
      protein: prediction.protein,
      carbs: prediction.carbs,
      fat: prediction.fat,
      servingAmount: servingAmount,
      servingUnit: servingUnit,
    };
    
    onAdd(foodData);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Scan Food for {meal}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          
          {/* Upload Area */}
          {!prediction && !loading && (
             <div className={styles.uploadArea}>
               {preview ? (
                 <div className={styles.previewContainer}>
                   <img src={preview} alt="Upload preview" className={styles.previewImage} />
                   <button 
                     className="btn btn-secondary btn-sm"
                     onClick={() => {
                       setImage(null);
                       setPreview(null);
                     }}
                     style={{ marginTop: 12 }}
                   >
                     Change Photo
                   </button>
                 </div>
               ) : (
                 <div 
                   className={styles.dropzone}
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <div className={styles.uploadIcon}>📷</div>
                   <p>Tap to take a photo or upload</p>
                   <input 
                     type="file" 
                     accept="image/*"
                     capture="environment"
                     ref={fileInputRef}
                     style={{ display: 'none' }}
                     onChange={handleImageChange}
                   />
                 </div>
               )}
               
               {error && <p className={styles.error}>{error}</p>}
               
               <button 
                 className={`btn btn-primary btn-full ${styles.analyzeBtn}`}
                 disabled={!image}
                 onClick={handleAnalyze}
               >
                 Analyze Food
               </button>
             </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className={styles.loadingArea}>
               <div className={styles.scannerLine}></div>
               {preview && <img src={preview} alt="Analyzing" className={styles.previewImageDimmed} />}
               <p className={styles.loadingText}>AI is analyzing your plate...</p>
            </div>
          )}

          {/* Result Area */}
          {prediction && !loading && (
            <div className={styles.resultArea}>
              <div className={styles.predictionHeader}>
                 <h3 className={styles.foodName}>
                   {prediction.name.charAt(0).toUpperCase() + prediction.name.slice(1)}
                 </h3>
                 <span className={styles.confidence}>
                   {Math.round(prediction.confidence * 100)}% Match
                 </span>
              </div>
              
              <p className={styles.disclaimer}>{prediction.message}</p>

              <div className={styles.servingRow}>
                <div className={styles.field}>
                  <label className="label">Amount</label>
                  <div className={styles.servingGroup}>
                    <input
                      type="number"
                      className={`input num ${styles.servingInput}`}
                      value={servingAmount}
                      onChange={(e) => setServingAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                    <select 
                      className={styles.unitSelect}
                      value={servingUnit}
                      onChange={(e) => setServingUnit(e.target.value)}
                    >
                      <option value="g">grams</option>
                      <option value="ml">ml</option>
                      <option value="oz">oz</option>
                      <option value="serving">servings</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.macrosCard}>
                <h4 className="label">Estimated Nutrition</h4>
                {(() => {
                  const calculated = calculateMacros();
                  return (
                    <div className={styles.macrosGrid}>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} style={{color: 'var(--accent)'}}>{calculated.calories}</span>
                        <span className={styles.macroLabel}>kcal</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} style={{color: 'var(--protein)'}}>{calculated.protein}g</span>
                        <span className={styles.macroLabel}>Protein</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} style={{color: 'var(--carbs)'}}>{calculated.carbs}g</span>
                        <span className={styles.macroLabel}>Carbs</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} style={{color: 'var(--fat)'}}>{calculated.fat}g</span>
                        <span className={styles.macroLabel}>Fat</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className={styles.actionButtons}>
                <button className="btn btn-secondary" onClick={() => setPrediction(null)}>
                  Try Again
                </button>
                <button className="btn btn-primary" onClick={handleAddSubmit}>
                  Log Food
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
