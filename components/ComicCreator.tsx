import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Users, BookOpen, Loader2, Check, ChevronRight, ChevronLeft, X, Plus, Edit2, Trash2, Download, Wand2 } from 'lucide-react';
import { COMIC_LAYOUTS, ART_STYLES, COLOR_MODES, COSTS } from '../constants';
import { GeneratedAsset, AssetType, ComicProject, ComicCharacter, ComicPanel } from '../types';
import { generatePanelBreakdown, generateComicPanel, generateImage } from '../services/geminiService';
import { buildComicPanelPrompt } from '../utils/comicPromptBuilder';
import { buildFullComicPrompt } from '../utils/fullComicPromptBuilder';
import { supabase } from '../supabaseClient';
import { generateId } from '../utils/uuid';
import { uploadUserAsset } from '../utils/storageUtils';

interface ComicCreatorProps {
    credits: number;
    deductCredits: (amount: number) => void;
    addAsset: (asset: GeneratedAsset) => void;
}

const ComicCreator: React.FC<ComicCreatorProps> = ({ credits, deductCredits, addAsset }) => {
    const [project, setProject] = useState<ComicProject>({
        step: 1,
        layout: '4-panel',
        artStyle: 'anime',
        colorMode: 'color',
        storyPrompt: '',
        selectedCharacters: [],
        panels: [],
        generatedPanels: [],
    });

    const [characterLibrary, setCharacterLibrary] = useState<ComicCharacter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCharacterForm, setShowCharacterForm] = useState(false);
    const [newCharacter, setNewCharacter] = useState<{ name: string; description: string; visualReference?: { data: string; mimeType: string; preview: string } }>({ name: '', description: '' });
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const [generatingCharacterImage, setGeneratingCharacterImage] = useState(false);

    // Load character library on mount
    // Load character library on mount
    useEffect(() => {
        fetchCharacters();
    }, []);

    const fetchCharacters = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', AssetType.CHARACTER)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedChars: ComicCharacter[] = data.map(asset => {
                    // Try to parse description and name from 'prompt' field which stores JSON
                    let charData = { name: 'Unknown', description: '' };
                    try {
                        charData = JSON.parse(asset.prompt);
                    } catch (e) {
                        // Fallback for old data or plain text
                        charData.description = asset.prompt;
                    }

                    return {
                        id: asset.id,
                        name: charData.name,
                        description: charData.description,
                        visualReference: asset.url ? {
                            data: '', // Not needed for display if we have preview aka url
                            mimeType: 'image/png', // Assumption
                            preview: asset.url
                        } : undefined,
                        createdAt: new Date(asset.created_at).getTime()
                    };
                });
                setCharacterLibrary(mappedChars);
            }
        } catch (error) {
            console.error('Error fetching characters:', error);
        }
    };

    // Get current layout config
    const currentLayout = COMIC_LAYOUTS.find(l => l.id === project.layout);
    const numPanels = currentLayout?.panels || 4;
    const totalCost = COSTS.COMIC_PANEL; // Fixed cost per comic (single image)

    // --- Handlers ---

    const handleGenerateCharacterImage = async () => {
        if (!newCharacter.description) {
            setError('กรุณาใส่รายละเอียดตัวละครก่อนสร้างรูป');
            return;
        }

        setGeneratingCharacterImage(true);
        setError(null);

        try {
            // Build character image prompt
            const characterPrompt = `Character reference sheet: ${newCharacter.description}. Full body character design, clean white background, front view, standing pose, detailed features, consistent design for comic/cartoon use. High quality illustration.`;

            const imageUrl = await generateImage(characterPrompt, '1:1');

            // Convert to base64
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64String = base64data.split(',')[1];

                setNewCharacter(prev => ({
                    ...prev,
                    visualReference: {
                        data: base64String,
                        mimeType: 'image/png',
                        preview: base64data
                    }
                }));
            };

            reader.readAsDataURL(blob);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถสร้างรูปตัวละครได้');
        } finally {
            setGeneratingCharacterImage(false);
        }
    };

    const handleSaveCharacter = async () => {
        if (!newCharacter.name || !newCharacter.description) {
            setError('กรุณากรอกชื่อและรายละเอียดตัวละคร');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('กรุณาเข้าสู่ระบบก่อนบันทึก');
                return;
            }

            // Store metadata (name, description) in prompt field as JSON string
            const metadata = JSON.stringify({
                name: newCharacter.name,
                description: newCharacter.description
            });

            let imageUrl = newCharacter.visualReference?.preview || '';

            // Upload to R2 Storage if it's base64
            if (imageUrl && imageUrl.startsWith('data:')) {
                try {
                    imageUrl = await uploadUserAsset(
                        imageUrl, 
                        user.id, 
                        'characters',
                        { name: newCharacter.name, prompt: newCharacter.description }
                    );
                } catch (uploadErr) {
                    console.error('Failed to upload character image:', uploadErr);
                    throw new Error('ไม่สามารถอัพโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
                }
            }

            const { error } = await supabase
                .from('assets')
                .insert([{
                    user_id: user.id,
                    type: AssetType.CHARACTER,
                    url: imageUrl,
                    prompt: metadata,
                    aspect_ratio: '1:1',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            // Refresh library
            fetchCharacters();
            setNewCharacter({ name: '', description: '' });
            setShowCharacterForm(false);
        } catch (err: any) {
            console.error('Save failed:', err);
            setError('บันทึกตัวละครไม่สำเร็จ: ' + err.message);
        }
    };

    const handleDeleteCharacter = async (id: string) => {
        try {
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setCharacterLibrary(prev => prev.filter(c => c.id !== id));
            setProject(prev => ({
                ...prev,
                selectedCharacters: prev.selectedCharacters.filter(c => c.id !== id)
            }));
        } catch (err) {
            console.error('Delete failed:', err);
            setError('ลบตัวละครไม่สำเร็จ');
        }
    };

    const toggleCharacterSelection = (character: ComicCharacter) => {
        setProject(prev => {
            const isSelected = prev.selectedCharacters.some(c => c.id === character.id);
            if (isSelected) {
                return {
                    ...prev,
                    selectedCharacters: prev.selectedCharacters.filter(c => c.id !== character.id)
                };
            } else {
                return {
                    ...prev,
                    selectedCharacters: [...prev.selectedCharacters, character]
                };
            }
        });
    };

    const handleGeneratePanelBreakdown = async () => {
        if (!project.storyPrompt.trim()) {
            setError('กรุณาใส่เรื่องราวที่ต้องการสร้าง');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const panelDescriptions = await generatePanelBreakdown(
                project.storyPrompt,
                numPanels,
                project.selectedCharacters
            );

            const panels: ComicPanel[] = panelDescriptions.map((desc, idx) => ({
                panelNumber: idx + 1,
                prompt: desc,
            }));

            setProject(prev => ({ ...prev, panels, step: 4 }));
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถแบ่งเรื่องเป็น panels ได้');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateComic = async () => {
        if (credits < totalCost) {
            setError(`เครดิตไม่พียงพอ ต้องการ ${totalCost} เครดิต แต่มี ${credits} เครดิต`);
            return;
        }

        setLoading(true);
        setError(null);
        setGenerationProgress({ current: 1, total: 1 });

        try {
            // Prepare character references
            const characterRefs = project.selectedCharacters
                .filter(char => char.visualReference)
                .map(char => ({
                    data: char.visualReference!.data,
                    mimeType: char.visualReference!.mimeType
                }));

            // Build full comic prompt (single image with all panels)
            const fullPrompt = buildFullComicPrompt(project);

            // Generate single comic image
            const imageUrl = await generateComicPanel(
                fullPrompt,
                currentLayout?.aspectRatio || '1:1',
                characterRefs.length > 0 ? characterRefs : undefined
            );

            const asset: GeneratedAsset = {
                id: generateId(),
                type: AssetType.IMAGE,
                url: imageUrl,
                prompt: fullPrompt,
                createdAt: Date.now(),
                aspectRatio: currentLayout?.aspectRatio || '1:1'
            };

            addAsset(asset);
            deductCredits(totalCost);
            setProject(prev => ({ ...prev, generatedPanels: [asset], step: 5 }));
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถสร้างการ์ตูนได้');
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setProject({
            step: 1,
            layout: '4-panel',
            artStyle: 'anime',
            colorMode: 'color',
            storyPrompt: '',
            selectedCharacters: [],
            panels: [],
            generatedPanels: [],
        });
        setError(null);
    };

    // --- Step Renderers ---

    const renderStepper = () => (
        <div className="flex items-center justify-center mb-8 px-4">
            {[
                { step: 1, icon: Sparkles, label: 'ตั้งค่า' },
                { step: 2, icon: Users, label: 'ตัวละคร' },
                { step: 3, icon: BookOpen, label: 'เรื่องราว' },
                { step: 4, icon: ImageIcon, label: 'สร้าง' }
            ].map((s, idx, arr) => (
                <React.Fragment key={s.step}>
                    <div className={`flex flex-col items-center ${project.step >= s.step ? 'opacity-100' : 'opacity-40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${project.step === s.step || (project.step === 5 && s.step === 4)
                            ? 'bg-white text-black border-white'
                            : project.step > s.step
                                ? 'bg-primary text-white border-primary'
                                : 'bg-transparent text-zinc-600 border-zinc-700'
                            }`}>
                            {project.step > s.step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                        </div>
                        <span className="text-xs mt-1 text-zinc-400">{s.label}</span>
                    </div>
                    {idx < arr.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 mb-4 ${project.step > s.step ? 'bg-primary' : 'bg-zinc-800'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> ตั้งค่าการ์ตูน
                </h3>

                {/* Layout Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-3">เลือกเลย์เอาต์</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMIC_LAYOUTS.map(layout => (
                            <button
                                key={layout.id}
                                onClick={() => setProject(p => ({ ...p, layout: layout.id }))}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${project.layout === layout.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="font-semibold text-white mb-1">{layout.label}</div>
                                <div className="text-xs text-zinc-400">{layout.description}</div>
                                <div className="text-xs text-primary mt-2">{COSTS.COMIC_PANEL} เครดิต</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Art Style Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-3">สไตล์ลายเส้น</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ART_STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setProject(p => ({ ...p, artStyle: style.id }))}
                                className={`p-3 rounded-lg border transition-all ${project.artStyle === style.id
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                                    }`}
                            >
                                <div className="font-medium text-sm">{style.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Mode Selection */}
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">โหมดสี</label>
                    <div className="grid grid-cols-2 gap-3">
                        {COLOR_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setProject(p => ({ ...p, colorMode: mode.id }))}
                                className={`p-3 rounded-lg border transition-all ${project.colorMode === mode.id
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                                    }`}
                            >
                                <div className="font-medium">{mode.label}</div>
                                <div className="text-xs opacity-70">{mode.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => setProject(p => ({ ...p, step: 2 }))}
                    className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                    ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> คลังตัวละคร
                    </h3>
                    <button
                        onClick={() => setShowCharacterForm(!showCharacterForm)}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> สร้างตัวละครใหม่
                    </button>
                </div>

                {/* Character Creation Form */}
                {showCharacterForm && (
                    <div className="mb-6 p-4 bg-background border border-white/10 rounded-xl animate-fade-in">
                        <h4 className="font-semibold text-white mb-3">สร้างตัวละครใหม่</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-zinc-300 mb-1">ชื่อตัวละคร</label>
                                <input
                                    type="text"
                                    value={newCharacter.name}
                                    onChange={(e) => setNewCharacter(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white"
                                    placeholder="เช่น แมวน้อย"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-300 mb-1">รายละเอียด (รูปร่าง, บุคลิก, ลักษณะเด่น)</label>
                                <textarea
                                    value={newCharacter.description}
                                    onChange={(e) => setNewCharacter(p => ({ ...p, description: e.target.value }))}
                                    className="w-full h-20 bg-surface border border-white/10 rounded-lg p-2 text-white resize-none"
                                    placeholder="เช่น แมวสีส้ม ตาโต ใส่แว่นตา ชอบกินปลา บุคลิกขี้เล่น"
                                />
                            </div>

                            {/* Character Image Generation */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-zinc-300">รูปตัวละคร (ไม่บังคับ)</label>
                                    <button
                                        onClick={handleGenerateCharacterImage}
                                        disabled={generatingCharacterImage || !newCharacter.description}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {generatingCharacterImage ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                กำลังสร้าง...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-3.5 h-3.5" />
                                                สร้างรูปด้วย AI
                                            </>
                                        )}
                                    </button>
                                </div>
                                {newCharacter.visualReference && (
                                    <div className="relative">
                                        <img
                                            src={newCharacter.visualReference.preview}
                                            alt="Character preview"
                                            className="w-full h-48 object-cover rounded-lg border border-white/10"
                                        />
                                        <button
                                            onClick={() => setNewCharacter(p => ({ ...p, visualReference: undefined }))}
                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-zinc-500 mt-1">
                                    💡 สร้างรูปตัวละครเพื่อให้ AI ใช้เป็น reference ตอนสร้างการ์ตูน (ช่วยให้ตัวละครเหมือนเดิมทุก panel)
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveCharacter}
                                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
                                >
                                    บันทึก
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCharacterForm(false);
                                        setNewCharacter({ name: '', description: '' });
                                    }}
                                    className="bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Character Library */}
                <div className="mb-4">
                    <p className="text-sm text-zinc-400 mb-3">เลือกตัวละครที่ต้องการใช้ในการ์ตูน (เลือกได้หลายตัว)</p>
                    {characterLibrary.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>ยังไม่มีตัวละครในคลัง</p>
                            <p className="text-sm">คลิก "สร้างตัวละครใหม่" เพื่อเริ่มต้น</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {characterLibrary.map(char => {
                                const isSelected = project.selectedCharacters.some(c => c.id === char.id);
                                return (
                                    <div
                                        key={char.id}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                            ? 'border-primary bg-primary/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                        onClick={() => toggleCharacterSelection(char)}
                                    >
                                        <div className="flex gap-3">
                                            {/* Character Image */}
                                            {char.visualReference && (
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={char.visualReference.preview}
                                                        alt={char.name}
                                                        className="w-16 h-16 object-cover rounded-lg border border-white/10"
                                                    />
                                                </div>
                                            )}

                                            {/* Character Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-semibold text-white">{char.name}</div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCharacter(char.id);
                                                        }}
                                                        className="text-zinc-500 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-zinc-400 line-clamp-2">{char.description}</p>
                                                {isSelected && (
                                                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                                                        <Check className="w-3 h-3" /> เลือกแล้ว
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-sm text-primary">
                        💡 เลือกตัวละครที่ต้องการใช้ หรือข้ามขั้นตอนนี้เพื่อให้ AI สร้างตัวละครให้
                    </p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={() => setProject(p => ({ ...p, step: 1 }))}
                    className="text-zinc-400 hover:text-white flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
                </button>
                <button
                    onClick={() => setProject(p => ({ ...p, step: 3 }))}
                    className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                    ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> เรื่องราว
                </h3>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">ใส่ไอเดียเรื่องราว</label>
                    <textarea
                        value={project.storyPrompt}
                        onChange={(e) => setProject(p => ({ ...p, storyPrompt: e.target.value }))}
                        className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-white resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                        placeholder={`ตัวอย่าง: แมวพยายามจับปลาในตู้ปลา แต่ตกน้ำ\n\nหรือ: นักเรียนลืมทำการบ้าน พอครูเรียกตรวจก็อ้างว่าหมากินไป`}
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                        💡 เขียนเรื่องราวสั้นๆ AI จะช่วยแบ่งเป็น {numPanels} ช่องตามโครงสร้างแก๊กตลก
                    </p>
                </div>

                {project.selectedCharacters.length > 0 && (
                    <div className="mb-6 p-4 bg-background border border-white/10 rounded-xl">
                        <h4 className="text-sm font-semibold text-white mb-2">ตัวละครที่เลือก:</h4>
                        <div className="flex flex-wrap gap-2">
                            {project.selectedCharacters.map(char => (
                                <div key={char.id} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                                    {char.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-sm text-yellow-500">
                        ⚡ ค่าใช้จ่าย: {totalCost} เครดิต (สร้าง 1 ภาพการ์ตูน {numPanels} ช่อง)
                    </p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={() => setProject(p => ({ ...p, step: 2 }))}
                    className="text-zinc-400 hover:text-white flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
                </button>
                <button
                    onClick={handleGeneratePanelBreakdown}
                    disabled={loading || !project.storyPrompt.trim()}
                    className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    แบ่งเรื่องเป็น Panels
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" /> ตรวจสอบและสร้าง
                </h3>

                <div className="mb-6">
                    <p className="text-sm text-zinc-400 mb-4">
                        AI แบ่งเรื่องเป็น {numPanels} ช่องแล้ว คุณสามารถแก้ไขได้ก่อนสร้าง
                    </p>

                    <div className="space-y-4">
                        {project.panels.map((panel, idx) => (
                            <div key={idx} className="p-4 bg-background border border-white/10 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                                        {panel.panelNumber}
                                    </div>
                                    <h4 className="font-semibold text-white">
                                        Panel {panel.panelNumber}
                                        {numPanels === 4 && (
                                            <span className="ml-2 text-xs text-zinc-500">
                                                ({idx === 0 ? 'Setup' : idx === 1 ? 'Development' : idx === 2 ? 'Turn' : 'Punchline'})
                                            </span>
                                        )}
                                    </h4>
                                </div>
                                <textarea
                                    value={panel.prompt}
                                    onChange={(e) => {
                                        const updatedPanels = [...project.panels];
                                        updatedPanels[idx] = { ...updatedPanels[idx], prompt: e.target.value };
                                        setProject(p => ({ ...p, panels: updatedPanels }));
                                    }}
                                    className="w-full h-20 bg-surface border border-white/10 rounded-lg p-3 text-white text-sm resize-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl mb-4">
                    <p className="text-sm text-primary">
                        🎨 พร้อมสร้างการ์ตูน {numPanels} ช่อง ใช้ {totalCost} เครดิต (คุณมี {credits} เครดิต)
                    </p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={() => setProject(p => ({ ...p, step: 3 }))}
                    className="text-zinc-400 hover:text-white flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
                </button>
                <button
                    onClick={handleGenerateComic}
                    disabled={loading || credits < totalCost}
                    className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            กำลังสร้าง {generationProgress.current}/{generationProgress.total}
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            สร้างการ์ตูน
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const renderStep5 = () => {
        const comicImage = project.generatedPanels[0];

        const handleDownload = () => {
            if (!comicImage) return;

            const link = document.createElement('a');
            link.href = comicImage.url;
            link.download = `comic-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="bg-surface border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" /> สร้างเสร็จแล้ว!
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownload}
                                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/80 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                ดาวน์โหลด
                            </button>
                            <button
                                onClick={resetFlow}
                                className="text-zinc-400 hover:text-white flex items-center gap-2"
                            >
                                สร้างใหม่
                            </button>
                        </div>
                    </div>

                    {comicImage && (
                        <div className="mb-6">
                            <img
                                src={comicImage.url}
                                alt="Generated comic"
                                className="w-full h-auto rounded-xl border border-white/10"
                            />
                        </div>
                    )}

                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <p className="text-sm text-green-500">
                            ✅ การ์ตูนถูกบันทึกใน Gallery แล้ว คุณสามารถดาวน์โหลดหรือสร้างใหม่ได้
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-6">
            {renderStepper()}

            {error && (
                <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-red-500">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {project.step === 1 && renderStep1()}
            {project.step === 2 && renderStep2()}
            {project.step === 3 && renderStep3()}
            {project.step === 4 && renderStep4()}
            {project.step === 5 && renderStep5()}
        </div>
    );
};

export default ComicCreator;
