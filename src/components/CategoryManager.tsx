import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppIcon, IconName } from '@/components/ui/AppIcon';
import * as categoryStorage from '@/utils/categoryStorage';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  color: string;
  icon?: IconName | string;
  fields?: string[];
  includeInGoal?: boolean;
  description?: string;
  activeDays?: number[];
  createdAt?: string;
  updatedAt?: string;
};

// 기본 카테고리 (하드코딩, 삭제 불가)
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'QT', color: '#7DB87D', icon: 'bookOpen', includeInGoal: true, description: '말씀을 묵상하며 은혜를 나눠요', activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'content'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: '기도', color: '#A57DB8', icon: 'heart', includeInGoal: true, description: '하루의 기도를 적어보세요', activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'content'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: '감사', color: '#E8C87D', icon: 'sparkles', includeInGoal: true, description: '감사했던 순간을 떠올려보세요', activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'content'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', name: '일기', color: '#DD957D', icon: 'pencilLine', includeInGoal: true, description: '오늘의 마음을 기록해보세요', activeDays: [0, 1, 2, 3, 4, 5, 6], fields: ['title', 'content'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// 기존 카테고리 색상(초록, 보라, 노랑, 오렌지)과 겹치지 않는 다양한 색상 (텍스트 가독성 고려)
const COLORS = ['#6B9BD1', '#E17B8C', '#8DABA8', '#C9A86A', '#9B87BE', '#D4886E', '#7AA3B5', '#B88FA3'];

const AVAILABLE_ICONS: IconName[] = [
  'bookOpen', 'heart', 'sparkles', 'pencilLine', 'book', 'sun', 
  'calendar', 'bell', 'image', 'palette', 'star', 'moon',
  'cloud', 'music', 'gift', 'lightbulb', 'target', 'flag',
  'anchor', 'award', 'coffee', 'flower', 'hand'
] as IconName[];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectCategory?: (category: Category) => void;
};

export const CategoryManager: React.FC<Props> = ({ open, onClose, onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIcon, setNewIcon] = useState<IconName>('bookOpen');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(['title', 'content']);
  const [includeInGoal, setIncludeInGoal] = useState(true);
  const [newDescription, setNewDescription] = useState('');
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editOriginalName, setEditOriginalName] = useState('');
  const [editIncludeInGoal, setEditIncludeInGoal] = useState(true);
  const [editActiveDays, setEditActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Load categories from Supabase
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const dbCategories = await categoryStorage.list();

      // user_id가 있는 것만 커스텀 카테고리 (기본 카테고리는 user_id가 null)
      const customCategories = dbCategories.filter((cat: any) => cat.user_id != null);

      // ID로 중복 제거 (같은 ID가 여러 번 나타나는 경우 첫 번째만 유지)
      const uniqueCustomCategories = customCategories.reduce((acc: Category[], cat: any) => {
        if (!acc.find(c => c.id === cat.id)) {
          acc.push(cat as Category);
        }
        return acc;
      }, []);

      const allCategories = [...DEFAULT_CATEGORIES, ...uniqueCustomCategories];

      // 커스텀 카테고리 캐시 업데이트
      sessionStorage.setItem('custom_categories', JSON.stringify(uniqueCustomCategories));

      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('카테고리를 불러오는데 실패했습니다');
      // 에러가 나도 기본 카테고리는 표시
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newName.trim() || selectedFields.length === 0) return;

    // 중복 생성 방지
    if (categories.some(cat => cat.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error('같은 이름의 카테고리가 이미 있습니다');
      return;
    }

    try {
      const finalDescription = newDescription.trim() || `${newName.trim()}에 대해 기록해보세요`;

      const newCategory = await categoryStorage.create({
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
        fields: selectedFields,
        includeInGoal: includeInGoal,
        description: finalDescription,
        activeDays: activeDays.length > 0 ? activeDays : [0, 1, 2, 3, 4, 5, 6],
      });

      // DB에서 최신 목록을 다시 불러와 상태를 동기화합니다.
      await loadCategories();

      setNewName('');
      setNewColor(COLORS[0]);
      setNewIcon('bookOpen');
      setSelectedFields(['title', 'content']);
      setIncludeInGoal(true);
      setNewDescription('');
      setActiveDays([0, 1, 2, 3, 4, 5, 6]);
      setShowNewDialog(false);

      console.log('✅ Category created:', newCategory);
      console.log('📢 Dispatching categoriesUpdated event');
      toast.success('카테고리가 추가되었습니다');
      window.dispatchEvent(new Event('categoriesUpdated'));
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('카테고리 추가에 실패했습니다');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoryStorage.remove(id);
      // Re-fetch from storage to ensure consistency
      await loadCategories();

      toast.success('카테고리가 삭제되었습니다');
      window.dispatchEvent(new Event('categoriesUpdated'));
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('카테고리 삭제에 실패했습니다');
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditOriginalName(category.name); // Track original name
    setEditIncludeInGoal(category.includeInGoal ?? true);
    setEditActiveDays(category.activeDays ?? [0, 1, 2, 3, 4, 5, 6]);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;

    try {
      // Check if description follows the default pattern "{original name}에 대해 기록해보세요"
      const defaultPattern = `${editOriginalName}에 대해 기록해보세요`;
      const isDefaultDescription = editDescription.trim() === defaultPattern;

      // If name changed and description is still the default pattern, auto-update it
      let finalDescription = editDescription.trim();
      if (isDefaultDescription && editName.trim() !== editOriginalName) {
        finalDescription = `${editName.trim()}에 대해 기록해보세요`;
      } else if (!finalDescription) {
        // If description is empty, generate default
        finalDescription = `${editName.trim()}에 대해 기록해보세요`;
      }

      await categoryStorage.update(editingCategory.id, {
        name: editName.trim(),
        description: finalDescription,
        includeInGoal: editIncludeInGoal,
        activeDays: editActiveDays,
      });

      await loadCategories();
      window.dispatchEvent(new Event('categoriesUpdated'));

      setShowEditDialog(false);
      setEditingCategory(null);
      setEditName('');
      setEditDescription('');
      setEditOriginalName('');
      setEditIncludeInGoal(true);
      setEditActiveDays([0, 1, 2, 3, 4, 5, 6]);

      toast.success('카테고리가 수정되었습니다');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('카테고리 수정에 실패했습니다');
    }
  };

  const handleSelectCategory = (category: Category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[380px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#F0EFED]">
            <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E]">
              카테고리 관리
            </DialogTitle>
            <DialogDescription className="sr-only">
              기록 카테고리를 추가하고 관리합니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {categories.map(category => {
                const isDefaultCategory = ['1', '2', '3', '4'].includes(category.id);
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#FAF9F7] hover:bg-[#F3F2F1] transition-colors cursor-pointer group"
                    onClick={() => handleSelectCategory(category)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.icon ? (
                          <AppIcon name={category.icon as IconName} size={20} color="white" strokeWidth={2} />
                        ) : (
                          <span className="text-white text-[14px] font-medium">
                            {category.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-[#2E2E2E]">
                          {category.name}
                        </span>
                      </div>
                    </div>

                    {!isDefaultCategory && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(category);
                          }}
                          className="p-2 hover:bg-[#E8E7E5] rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4 text-[#7C7C7C]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className="p-2 hover:bg-[#E8E7E5] rounded-lg transition-colors"
                          title="삭제"
                        >
                          <X className="w-4 h-4 text-[#D1D0CE]" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-[13px] text-[#8A8A8A]">
                새 카테고리 만들기 ({categories.length}/10)
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#F0EFED]">
            <Button
              onClick={() => setShowNewDialog(true)}
              className="w-full h-11 bg-[#2E2E2E] hover:bg-[#1E1E1E] text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              카테고리 추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 새 카테고리 생성 다이얼로그 */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#F0EFED] relative">
            <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E]">
              새 카테고리 만들기
            </DialogTitle>
            <DialogDescription className="sr-only">
              카테고리 이름, 색상, 포함할 필드를 선택하여 새 카테고리를 만듭니다
            </DialogDescription>
            <button
              onClick={() => {
                setShowNewDialog(false);
                setNewName('');
                setNewDescription('');
                setNewColor(COLORS[0]);
                setNewIcon('bookOpen');
                setSelectedFields(['title', 'content']);
                setIncludeInGoal(true);
                setActiveDays([0, 1, 2, 3, 4, 5, 6]);
              }}
              className="absolute right-6 top-6 p-1 hover:bg-[#F3F2F1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#7E7C78]" />
            </button>
          </DialogHeader>
          
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* 카테고리 이름 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-2 block">
                카테고리 이름 *
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 간증, 성경메모, 찬양노트"
                className="h-12 text-[14px] border-[#E8E7E5] bg-[#F9F8F6]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreateCategory();
                }}
              />
            </div>

            {/* 카테고리 설명 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-2 block">
                설명 (선택 사항)
              </label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="예: 말씀을 묵상하며 은혜를 나눠요"
                className="h-12 text-[14px] border-[#E8E7E5] bg-[#F9F8F6]"
              />
              <p className="text-[12px] text-[#8A8A8A] mt-1.5">
                비워두면 "{newName.trim() || '카테고리 이름'}에 대해 기록해보세요"로 자동 생성됩니다
              </p>
            </div>

            {/* 카테고리 색상 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-3 block">
                카테고리 색상
              </label>
              <div className="flex gap-2.5">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-11 h-11 rounded-full transition-all ${
                      newColor === color ? 'ring-2 ring-offset-2 ring-[#2E2E2E] scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 카테고리 아이콘 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-3 block">
                카테고리 아이콘
              </label>
              <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
                {AVAILABLE_ICONS.map(iconName => (
                  <button
                    key={iconName}
                    onClick={() => setNewIcon(iconName)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      newIcon === iconName 
                        ? 'bg-[#2E2E2E] text-white scale-105' 
                        : 'bg-[#F9F8F6] text-[#7E7C78] hover:bg-[#F3F2F1] hover:scale-105'
                    }`}
                  >
                    <AppIcon name={iconName} size={20} strokeWidth={2} />
                  </button>
                ))}
              </div>
            </div>

            {/* 포함할 필드 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-3 block">
                포함할 필드 * (최소 1개)
              </label>
              <div className="space-y-2">
                {[
                  { id: 'title', label: '제목 입력란', desc: '말씀 제목을 입력할 수 있습니다' },
                  { id: 'passage', label: '본문 입력란', desc: '성경 본문을 입력할 수 있습니다' },
                  { id: 'content', label: '내용 입력란', desc: '자유롭게 내용을 입력할 수 있습니다' },
                  { id: 'application', label: '오늘의 적용', desc: '실천할 내용을 입력할 수 있습니다' },
                  { id: 'answered', label: '응답 여부 체크', desc: '완료/응답 여부를 체크할 수 있습니다' },
                ].map(field => (
                  <label
                    key={field.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#F9F8F6] hover:bg-[#F3F2F1] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields([...selectedFields, field.id]);
                        } else {
                          setSelectedFields(selectedFields.filter(f => f !== field.id));
                        }
                      }}
                      className="w-5 h-5 rounded border-[#E8E7E5] text-[#2E2E2E] focus:ring-[#2E2E2E] mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-[#2E2E2E] mb-0.5">
                        {field.label}
                      </div>
                      <div className="text-[13px] text-[#8A8A8A]">
                        {field.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 오늘의 목표에 포함 */}
            <div className="pt-2 border-t border-[#F0EFED]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInGoal}
                  onChange={(e) => setIncludeInGoal(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E8E7E5] text-[#7DB87D] focus:ring-[#7DB87D] mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-[#2E2E2E] mb-1">
                    오늘의 목표에 포함하기
                  </div>
                  <div className="text-[13px] text-[#8A8A8A] leading-relaxed">
                    이 카테고리를 끄면 홈 화면의 달성률 계산에서 제외됩니다.
                  </div>
                </div>
              </label>
            </div>

            {/* 반복 요일 설정 */}
            <div className="pt-2">
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-3 block">
                반복 요일 설정
              </label>
              <p className="text-[13px] text-[#8A8A8A] mb-3">
                이 카테고리를 기록할 요일을 선택해주세요. 선택하지 않은 요일에는 목표에서 제외됩니다.
              </p>
              <div className="flex gap-2 justify-between">
                {[
                  { day: 0, label: '일' },
                  { day: 1, label: '월' },
                  { day: 2, label: '화' },
                  { day: 3, label: '수' },
                  { day: 4, label: '목' },
                  { day: 5, label: '금' },
                  { day: 6, label: '토' },
                ].map(({ day, label }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setActiveDays(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day].sort()
                      );
                    }}
                    className={`flex-1 h-11 rounded-full text-[14px] font-medium transition-all ${
                      activeDays.includes(day)
                        ? 'bg-[#7DB87D] text-white shadow-sm scale-105'
                        : 'bg-[#F9F8F6] text-[#ACACAC] hover:bg-[#F3F2F1]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#F0EFED] flex gap-3">
            <Button
              onClick={() => {
                setShowNewDialog(false);
                setNewName('');
                setNewDescription('');
                setNewColor(COLORS[0]);
                setNewIcon('bookOpen');
                setSelectedFields(['title', 'content']);
                setIncludeInGoal(true);
                setActiveDays([0, 1, 2, 3, 4, 5, 6]);
              }}
              variant="outline"
              className="flex-1 h-12 border-[#E8E7E5] text-[#7E7C78] hover:bg-[#F3F2F1] rounded-xl text-[15px]"
            >
              취소
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newName.trim() || selectedFields.length === 0}
              className="flex-1 h-12 bg-[#2E2E2E] hover:bg-[#1E1E1E] text-white disabled:bg-[#E8E7E5] disabled:text-[#ACACAC] rounded-xl text-[15px] font-medium"
            >
              만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[420px] rounded-3xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#F0EFED] relative">
            <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E]">
              카테고리 수정
            </DialogTitle>
            <DialogDescription className="sr-only">
              카테고리 이름과 설명을 수정합니다
            </DialogDescription>
            <button
              onClick={() => {
                setShowEditDialog(false);
                setEditingCategory(null);
                setEditName('');
                setEditDescription('');
                setEditOriginalName('');
                setEditIncludeInGoal(true);
                setEditActiveDays([0, 1, 2, 3, 4, 5, 6]);
              }}
              className="absolute right-6 top-6 p-1 hover:bg-[#F3F2F1] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#7E7C78]" />
            </button>
          </DialogHeader>
          
          <div className="px-6 py-5 space-y-4">
            {/* 카테고리 이름 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-2 block">
                카테고리 이름 *
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="카테고리 이름을 입력하세요"
                className="h-12 text-[14px] border-[#E8E7E5] bg-[#F9F8F6]"
              />
            </div>

            {/* 카테고리 설명 */}
            <div>
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-2 block">
                설명 (선택 사항)
              </label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="예: 말씀을 묵상하며 은혜를 나눠요"
                className="h-12 text-[14px] border-[#E8E7E5] bg-[#F9F8F6]"
              />
              <p className="text-[12px] text-[#8A8A8A] mt-1.5">
                비워두면 "{editName.trim() || '카테고리 이름'}에 대해 기록해보세요"로 자동 생성됩니다
              </p>
            </div>

            {/* 오늘의 목표에 포함 */}
            <div className="pt-2 border-t border-[#F0EFED]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIncludeInGoal}
                  onChange={(e) => setEditIncludeInGoal(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E8E7E5] text-[#7DB87D] focus:ring-[#7DB87D] mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-[#2E2E2E] mb-1">
                    오늘의 목표에 포함하기
                  </div>
                  <div className="text-[13px] text-[#8A8A8A] leading-relaxed">
                    이 카테고리를 끄면 홈 화면의 달성률 계산에서 제외됩니다.
                  </div>
                </div>
              </label>
            </div>

            {/* 반복 요일 설정 */}
            <div className="pt-2">
              <label className="text-[14px] font-medium text-[#2E2E2E] mb-3 block">
                반복 요일 설정
              </label>
              <p className="text-[13px] text-[#8A8A8A] mb-3">
                이 카테고리를 기록할 요일을 선택해주세요. 선택하지 않은 요일에는 목표에서 제외됩니다.
              </p>
              <div className="flex gap-2 justify-between">
                {[
                  { day: 0, label: '일' },
                  { day: 1, label: '월' },
                  { day: 2, label: '화' },
                  { day: 3, label: '수' },
                  { day: 4, label: '목' },
                  { day: 5, label: '금' },
                  { day: 6, label: '토' },
                ].map(({ day, label }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setEditActiveDays(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day].sort()
                      );
                    }}
                    className={`flex-1 h-11 rounded-full text-[14px] font-medium transition-all ${
                      editActiveDays.includes(day)
                        ? 'bg-[#7DB87D] text-white shadow-sm scale-105'
                        : 'bg-[#F9F8F6] text-[#ACACAC] hover:bg-[#F3F2F1]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#F0EFED] flex gap-3">
            <Button
              onClick={() => {
                setShowEditDialog(false);
                setEditingCategory(null);
                setEditName('');
                setEditDescription('');
                setEditOriginalName('');
                setEditIncludeInGoal(true);
                setEditActiveDays([0, 1, 2, 3, 4, 5, 6]);
              }}
              variant="outline"
              className="flex-1 h-12 border-[#E8E7E5] text-[#7E7C78] hover:bg-[#F3F2F1] rounded-xl text-[15px]"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
              className="flex-1 h-12 bg-[#2E2E2E] hover:bg-[#1E1E1E] text-white disabled:bg-[#E8E7E5] disabled:text-[#ACACAC] rounded-xl text-[15px] font-medium"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
